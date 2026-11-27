"""Огибающая громкости: печатает уровень по 50 мс в заданных окнах, чтобы найти паузы для склеек."""
import sys, wave, array, math
path = sys.argv[1]
w = wave.open(path); sr = w.getframerate(); data = array.array('h', w.readframes(w.getnframes()))
hop = int(sr * 0.05)
def level(i):
    seg = data[i:i + hop]
    if not seg: return -90
    # грубый фильтр верхних частот: разность соседних отсчётов (речь и согласные заметнее гула игры)
    d = [seg[k] - seg[k - 1] for k in range(1, len(seg))]
    r = math.sqrt(sum(x * x for x in d) / max(1, len(d)))
    return 20 * math.log10(r + 1) - 90
for rng in sys.argv[2:]:
    a, b = map(float, rng.split('-'))
    print(f'== {a}-{b}')
    t = a; line = []
    while t < b:
        line.append(f'{level(int(t * sr)):.0f}')
        t += 0.05
        if len(line) == 20:
            print(f'{t - 1:6.2f}: ' + ' '.join(line)); line = []
    if line: print(f'{t - len(line) * 0.05:6.2f}: ' + ' '.join(line))
