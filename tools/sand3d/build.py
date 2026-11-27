"""Собрать предмет sand3d: программа .py → GLB + файл для страницы + сводка + превью.

    tools/sand3d/run <программа.py> [--fn head] [--name имя] [--out папка]
                     [--png] [--pose петля=значение,...] [--view az,el] [--size 900]
                     [--stl] [--urdf]

Программа — обычный модуль с `import sand3d as s3d` и функциями; головная функция (первая
в файле, или --fn) возвращает предмет (`s3d.assembly(...)` или одно тело).

Пишет в --out (по умолчанию — рядом с программой):
    <имя>.glb       модель в покое, метры, Y вверх; петли — в extras узлов (s3d_joint)
    <имя>.glb.js    тот же GLB в base64 для страницы с file://: window.GLB_DATA["<имя>"]
    <имя>.json      сводка: детали, петли (тип, ось, пределы в градусах/мм), габарит в мм, время
    <имя>.png       превью (--png): Cycles, светлый фон, поза из --pose (градусы / мм программы)
    <имя>.stl, .urdf по флагам

Код выхода 1 и понятное сообщение, если программа упала: его и читать агенту.
"""
import argparse
import base64
import importlib.util
import inspect
import json
import math
import struct
import sys
import time
import traceback
from pathlib import Path

import sand3d as s3d


def head_function(mod, name):
    if name:
        return getattr(mod, name)
    fns = [f for _, f in inspect.getmembers(mod, inspect.isfunction) if f.__module__ == mod.__name__]
    if not fns:
        sys.exit("в программе нет функций: головная функция строит предмет и возвращает его")
    return min(fns, key=lambda f: f.__code__.co_firstlineno)   # первая в файле — «оглавление»


def glb_json(path):
    data = path.read_bytes()
    off = 12
    while off < len(data):
        n, kind = struct.unpack_from("<II", data, off)
        if kind == 0x4E4F534A:
            return json.loads(data[off + 8: off + 8 + n])
        off += 8 + n
    return {}


def summary(g, unit_mm):
    joints, parts = [], []
    for n in g.get("nodes", []):
        j = (n.get("extras") or {}).get("s3d_joint")
        if j:
            ang = j["type"] in ("revolute", "continuous")
            conv = (lambda v: round(math.degrees(v), 2)) if ang else (lambda v: round(v * 1000 / unit_mm, 2))
            e = {"name": j["name"], "type": j["type"], "axis_gltf": j.get("axis"),
                 "unit": "град" if ang else "мм"}
            if "lower" in j:
                e["range"] = [conv(j["lower"]), conv(j["upper"])]
            if "mimic" in j:
                e["follows"] = j["mimic"]
            joints.append(e)
        elif "mesh" in n:
            parts.append(n.get("name"))
    return joints, parts


def preview(png, size, view):
    import bpy
    from mathutils import Vector

    sc = bpy.context.scene
    obs = [o for o in sc.objects if o.type == "MESH" and o.visible_get()]
    pts = [o.matrix_world @ Vector(c) for o in obs for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    centre, radius = (lo + hi) / 2, (hi - lo).length / 2

    az, el = (math.radians(float(v)) for v in view.split(","))
    d = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))  # az от фронта -Y к +X
    cam_data = bpy.data.cameras.new("s3d~cam")
    cam_data.lens = 70
    cam_data.clip_end = radius * 100
    cam = bpy.data.objects.new("s3d~cam", cam_data)
    sc.collection.objects.link(cam)
    fov = cam_data.angle
    cam.location = centre + d * (radius / math.sin(fov / 2) * 1.08)
    cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    sc.camera = cam

    sun_data = bpy.data.lights.new("s3d~sun", "SUN")
    sun_data.energy = 3.0
    sun_data.angle = math.radians(8)
    sun = bpy.data.objects.new("s3d~sun", sun_data)
    sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(35))
    sc.collection.objects.link(sun)

    world = sc.world or bpy.data.worlds.new("s3d~world")
    sc.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs[0].default_value = (0.86, 0.84, 0.80, 1)   # светлый тёплый фон: не «тёмный с неоном»
    bg.inputs[1].default_value = 0.9

    sc.render.engine = "CYCLES"
    sc.cycles.samples = 48
    sc.cycles.use_denoising = True
    sc.render.resolution_x = sc.render.resolution_y = size
    sc.render.film_transparent = False
    sc.view_settings.view_transform = "AgX"
    sc.render.filepath = str(png)
    sc.render.image_settings.file_format = "PNG"
    bpy.ops.render.render(write_still=True)
    for o in (cam, sun):
        bpy.data.objects.remove(o)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("program")
    ap.add_argument("--fn")
    ap.add_argument("--name")
    ap.add_argument("--out")
    ap.add_argument("--png", action="store_true")
    ap.add_argument("--pose", default="", help="петля=значение через запятую, для превью")
    ap.add_argument("--view", default="35,22", help="азимут,высота в градусах; 0,0 — строго спереди (-Y)")
    ap.add_argument("--size", type=int, default=900)
    ap.add_argument("--stl", action="store_true")
    ap.add_argument("--urdf", action="store_true")
    a = ap.parse_args()

    prog = Path(a.program).resolve()
    out = Path(a.out).resolve() if a.out else prog.parent
    out.mkdir(parents=True, exist_ok=True)
    name = a.name or prog.stem
    t0 = time.time()

    s3d.empty_scene()
    try:
        spec = importlib.util.spec_from_file_location(prog.stem, prog)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        fn = head_function(mod, a.fn)
        root = fn()
        if root is None:
            sys.exit(f"{fn.__name__}() ничего не вернула: головная функция возвращает s3d.assembly(...) или тело")
        root = getattr(root, "root", root)                 # Handle → его корень
        t_build = time.time() - t0
        glb = out / f"{name}.glb"
        s3d.export(root, glb)                              # в покое: петли программы в 0
        if a.stl:
            s3d.export(root, out / f"{name}.stl")
        if a.urdf:
            s3d.export(root, out / f"{name}.urdf")
        poses = [p.split("=") for p in a.pose.split(",") if p.strip()]
        for j, v in poses:
            s3d.pose(root, float(v), joint=j.strip())
        if a.png:
            preview(out / f"{name}.png", a.size, a.view)
    except SystemExit:
        raise
    except Exception as e:
        tb = traceback.extract_tb(e.__traceback__)
        mine = [f for f in tb if Path(f.filename).resolve() == prog]
        where = f"{prog.name}:{mine[-1].lineno}: {mine[-1].line}" if mine else ""
        print(f"ОШИБКА {type(e).__name__}: {e}\n{where}", file=sys.stderr)
        sys.exit(1)

    unit_mm = {"mm": 1, "cm": 10, "m": 1000}.get(s3d.units() if callable(getattr(s3d, "units", None)) else "mm", 1)
    g = glb_json(glb)
    joints, parts = summary(g, unit_mm)
    raw = glb.read_bytes()
    (out / f"{name}.glb.js").write_text(
        "// generated by tools/sand3d/build.py: не править руками\n"
        f"window.GLB_DATA = window.GLB_DATA || {{}};\nwindow.GLB_DATA[{json.dumps(name)}] = "
        f"\"{base64.b64encode(raw).decode()}\";\n")

    import bpy
    from mathutils import Vector
    obs = [o for o in bpy.context.scene.objects if o.type == "MESH" and not o.name.startswith("s3d~")]
    pts = [o.matrix_world @ Vector(c) for o in obs for c in o.bound_box]
    size_mm = [round((max(p[i] for p in pts) - min(p[i] for p in pts)) * unit_mm, 1) for i in range(3)] if pts else []
    info = {"name": name, "program": str(prog), "head": fn.__name__, "parts": parts, "joints": joints,
            "size_mm_xyz": size_mm, "glb_kb": round(len(raw) / 1024, 1),
            "faces": sum(len(o.data.polygons) for o in obs),
            "build_s": round(t_build, 2), "total_s": round(time.time() - t0, 2)}
    (out / f"{name}.json").write_text(json.dumps(info, ensure_ascii=False, indent=1))
    print(json.dumps(info, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
