# Восстановление повторов кадров в клипе Seedance: python3 fixframes.py <клип.mp4> <период> <остаток> <выход.mp4>
# Seedance отдаёт 24 к/с, но в части клипов каждый ПЕРИОД-й кадр — повтор соседнего (на глаз — «просел FPS»).
# Кадр с номером n, где n mod ПЕРИОД = ОСТАТОК, заменяется промежуточным кадром между соседями n−1 и n+1
# (ffmpeg minterpolate по ряду из соседей); остальные кадры и звук остаются исходными, число кадров не меняется.
# Период и остаток берутся из замера разницы соседних кадров (journal.md).
import subprocess, sys
src, P, R, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
w, h = [int(v) for v in subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                                        "-of", "csv=p=0", src], capture_output=True, text=True).stdout.strip().split(",")[:2]]
size = w * h * 3 // 2
MI = "minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=none"
# соседи заменяемого кадра имеют чётность (R−1): из кадров этой чётности строится ряд 12 к/с и достраивается до 24
if (R - 1) % 2 == 0: vf = f"select='not(mod(n,2))',setpts=N/12/TB,{MI}"                               # кадр ряда n = время n
else:                vf = f"select='mod(n,2)',setpts=N/12/TB,{MI},tpad=start=1:start_mode=clone"      # ряд сдвинут на кадр
raw = ["-f", "rawvideo", "-pix_fmt", "yuv420p", "-"]
A = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-an"] + raw, stdout=subprocess.PIPE)
B = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-an", "-vf", vf] + raw, stdout=subprocess.PIPE)
E = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "yuv420p", "-s", f"{w}x{h}", "-r", "24", "-i", "-",
                      "-i", src, "-map", "0:v", "-map", "1:a?", "-c:v", "libx264", "-crf", "12", "-preset", "slow", "-pix_fmt", "yuv420p",
                      "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-c:a", "copy", out], stdin=subprocess.PIPE)
n = rep = 0
while True:
    a = A.stdout.read(size)
    if len(a) < size: break
    b = B.stdout.read(size)
    if n % P == R and len(b) == size and n > 0: E.stdin.write(b); rep += 1
    else: E.stdin.write(a)
    n += 1
E.stdin.close(); E.wait(); A.wait(); B.kill()
print(f"готово: {out} — кадров {n}, заменено {rep}")
