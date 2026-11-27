"""Навесной замок: корпус, дужка на двух петлях, ключ.

Миллиметры, Z вверх, лицо смотрит -Y. Ключ поворачивается в скважине (0–90°), дужка поднимается
вслед за ключом (ведомая петля: 90° ключа = подъём lift), затем отворачивается на длинной ноге
(0–180°). Всё построено в покое; позы ставит сцена (three.js) или build.py --pose.
"""
import sand3d as s3d


def padlock(w=40, d=18, h=34, gap=22, lift=10, key_h=0.38, key_in=10):
    body = body_part(w, d, h)

    f = s3d.local(body, -gap / 2, 0, h)                     # длинная нога дужки: ось поворота
    shackle = s3d.at(shackle_part(gap), on=f)
    s3d.seat(body, shackle)                                  # гнёзда под ноги — по месту, в покое

    fk = body.face("-Y").move(0, h * key_h)                  # скважина на лице; Z кадра смотрит наружу
    key = s3d.at(key_part(), on=fk.offset(-key_in))          # key_in мм лезвия — в скважине
    s3d.seat(body, key)

    s3d.joint("key_turn", key, fk, axis="normal", range=(0, 90))
    s3d.joint("lift", shackle, f, kind="prismatic", axis="+Z", follows="key_turn", ratio=lift / 90)
    s3d.joint("swing", shackle, f, axis="+Z", range=(0, 180))
    return s3d.assembly("padlock", body, shackle, key)


def body_part(w, d, h, r=5):
    body = s3d.box("body", w, d, h)
    s3d.fillet(body, r, edges="side")
    s3d.fillet(body, 1.2, edges="top")
    s3d.material(body, "brass", color="#c9a24a")
    return body


def shackle_part(gap, wire_d=6, rise=22, deep=14, short=3):
    """U-дужка в своей системе: длинная нога на x = 0 уходит на deep в корпус, короткая — на short."""
    path = [(0, 0, -deep), (0, 0, rise), (gap, 0, rise), (gap, 0, -short)]
    shackle = s3d.wire("shackle", path, wire_d, fillet=gap / 2 * 0.98)
    s3d.material(shackle, "chrome")
    return shackle


def key_part(blade_w=7, blade_t=2, blade_l=24, bow_d=18, bow_t=3):
    """Стоит вертикально (в кадре скважины Y — вверх), лезвие вдоль Z — наружу из скважины."""
    blade = s3d.box("blade", blade_t, blade_w, blade_l)
    bow = s3d.extrude("bow", s3d.circle(bow_d), bow_t, both=True)
    s3d.hole(bow, bow_d / 3)
    bow = s3d.at(bow, ry=90, z=blade_l + bow_d / 2 - 2)
    s3d.join(blade, bow)
    s3d.material(blade, "steel", color="#9aa0a6")
    return blade
