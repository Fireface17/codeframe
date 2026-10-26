# Данные для кадра ролика №4 — один источник: свой запуск tiktoken (o200k_base) по точным строкам плана §9.
#   export PATH="/opt/homebrew/bin:$PATH"; uv run --quiet --with tiktoken python -I tools/bpe_tokens.py <корень проекта>
# Пишет tokens.json и js/tokens-data.js (генерируются, руками не править). Сверка — refs/research/tokens-probe/.
import json, sys, os, tiktoken

root = sys.argv[1]
e = tiktoken.get_encoding("o200k_base")
R = e._mergeable_ranks
inv = {v: k for k, v in R.items()}

def txt(b):
    try: return b.decode("utf-8")
    except UnicodeDecodeError: return None

def pieces(s):
    ids = e.encode(s)
    return [{"id": i, "text": e.decode_single_token_bytes(i).decode("utf-8")} for i in ids]

out = {"encoding": "o200k_base", "tiktoken": tiktoken.__version__, "n_vocab": e.n_vocab}

# 1. вопрос (без кавычек, «хорошо» строчными)
Q = "Сколько букв о в слове хорошо?"
out["question"] = {"text": Q, "pieces": pieces(Q)}

# 2. пирамида склеек ' хорошо' от байтов: tiktoken склеивает пару с наименьшим рангом, при равных — левую
W = " хорошо"
parts = [{"b": bytes([c]), "tier": 0, "lo": k, "hi": k} for k, c in enumerate(W.encode("utf-8"))]
base = []
for k, c in enumerate(W.encode("utf-8")):
    base.append({"byte": f"{c:02x}", "rank": R[bytes([c])]})
steps = []
while True:
    best = None
    for i in range(len(parts) - 1):
        r = R.get(parts[i]["b"] + parts[i + 1]["b"])
        if r is not None and (best is None or r < best[0]): best = (r, i)
    if best is None: break
    r, i = best
    a, b = parts[i], parts[i + 1]
    new = {"b": a["b"] + b["b"], "tier": 1 + max(a["tier"], b["tier"]), "lo": a["lo"], "hi": b["hi"]}
    steps.append({"n": len(steps) + 1, "id": r, "text": txt(new["b"]), "hex": new["b"].hex(" "),
                  "tier": new["tier"], "bytes": [new["lo"], new["hi"]],
                  "left": txt(a["b"]) or a["b"].hex(" "), "right": txt(b["b"]) or b["b"].hex(" ")})
    parts = parts[:i] + [new] + parts[i + 2:]
assert [R[p["b"]] for p in parts] == e.encode(W) == [46825]
out["merges"] = {"word": W, "bytes": base, "steps": steps, "final": e.encode(W)}

# буквы слова: байты и кусочек
out["letters"] = [{"ch": ch, "bytes": ch.encode().hex(" "), "id": R[ch.encode()]} for ch in "хорошо"]

# 3. ответ по буквам через пробел, без пробела впереди
ANS = "х о р о ш о"
out["answer"] = {"text": ANS, "pieces": pieces(ANS)}
assert [p["id"] for p in out["answer"]["pieces"]] == [724, 913, 1839, 913, 2982, 913]

# 4. всплеск перед вершиной: настоящие кусочки из промежутка 23694–46825 (читаемые, ≥ 2 букв)
import re
# только нейтральные строчные кусочки: без имён, мест, брендов, политики, религии, интима и сленга (правка оркестратора r1, п. 7)
BLOCK = re.compile(r"(интим|секс|sex|porn|lol|wtf|fuck|shit|damn|бог|god|allah|jesus|christ|church|церк|мечет|ислам|islam|"
                   r"jew|евре|путин|trump|biden|войн|war|nazi|наци|гей|gay|drug|нарк|kill|убий|смерт|death|blood|кров|"
                   r"пизд|хуй|бля|еба|ass|dick|cock|pussy|tit|сиськ|жоп|сук|суч|рус|росс|укр|москв|киев|беларус|казах|"
                   r"полит|выбор|elect|vote|terror|террор|бомб|bomb|gun|оруж|police|полиц|sexy|nude|голы|love|любов|"
                   r"hate|ненав|money|деньг|cash|crypt|bitcoin|virus|вирус|covid|ковид|beer|пив|vodka|водк|wine|вин$|^три$|^gov$|^два$|^одна?$)")
def readable(r, cyr_only=False):
    t = txt(inv[r])
    if not t or not t.isprintable(): return None
    s = t.strip()
    if len(s) < 2 or len(s) > 6 or not all(ch.isalpha() for ch in s): return None
    if s != s.lower(): return None                       # заглавные — имена, места, бренды
    is_cyr = all('а' <= ch <= 'я' or ch == 'ё' for ch in s)
    is_lat = all('a' <= ch <= 'z' for ch in s)
    if cyr_only and not is_cyr: return None
    if not (is_cyr or is_lat): return None
    if BLOCK.search(s): return None
    return t

LOOK_B = re.compile(r"(xyu|xy[aeiouy]|xuy|huy|hui|pizd|pidr|blya|bly|eb[aeiouy]|yeb|lesb|porn|sex|fuck|dick|cock|cum|suck|tits|ass|nude|xxx|gay|sperm)")
burst = []
span = (46825 - 23695) / 28
for k in range(28):
    r = int(23695 + k * span)
    while r < 46825:
        t = readable(r, cyr_only=(k % 2 == 0))
        if t and not LOOK_B.search(t.strip()): burst.append({"id": r, "text": t}); break
        r += 1
out["burst"] = {"from": 23694, "to": 46825, "between": 46825 - 23694 - 1, "pieces": burst}

# 5. поле словаря — БЕЛЫМ СПИСКОМ (прогон критиков 2, п. 1): только кусочки, которые o200k даёт на нейтральном тексте —
# сценарий ролика + простые бытовые фразы; строчные, ≥ 2 букв; сверху стоп-лист латинских двойников мата и интима
NEUTRAL = [
    "Утром я ставлю чайник и смотрю в окно.", "На улице идёт дождь, а дома тепло и тихо.",
    "Мама печёт пирог с яблоками и корицей.", "Кот спит на подоконнике рядом с цветком.",
    "Сегодня солнечно, ветер слабый, к вечеру прохладно.", "Купи хлеб, молоко, сыр и немного овощей.",
    "Телефон заряжается, ноутбук лежит на столе.", "Мы гуляем в парке и считаем облака.",
    "Включи свет, пожалуйста, уже темнеет.", "Суп получился вкусным, добавь соли по вкусу.",
    "Поезд приходит в семь, не опоздай на вокзал.", "Книга лежит на полке рядом с лампой.",
    "good morning, the coffee is ready on the kitchen table.", "it is raining today, so take an umbrella.",
    "my laptop needs a new battery and a faster charger.", "we cooked pasta with tomatoes and fresh basil.",
    "the garden looks green after the warm spring rain.", "please open the window, it is getting warm in here.",
    "the train leaves at seven from the central station.", "she reads a book while the tea is cooling.",
]
SCRIPT = json.load(open(os.path.join(root, "script.json")))["phrases"]
LOOK = re.compile(r"(xyu|xy[aeiouy]|xuy|huy|hui|pizd|pidr|blya|bly|eb[aeiouy]|yeb|lesb|porn|sex|fuck|dick|cock|cum|suck|tits|ass|nude|xxx|gay|sperm)")
def white_ok(t):
    st = t.strip()
    if len(st) < 2 or not st.isalpha() or st != st.lower(): return False
    cyr = all('а' <= ch <= 'я' or ch == 'ё' for ch in st); lat = all('a' <= ch <= 'z' for ch in st)
    if not (cyr or lat): return False
    return not (BLOCK.search(st) or LOOK.search(st))
seen, field = set(), []
for line in [p["display"] for p in SCRIPT] + NEUTRAL:
    for tid in e.encode(line):
        t = txt(e.decode_single_token_bytes(tid))
        if t and white_ok(t) and tid not in seen:
            seen.add(tid); field.append({"id": tid, "text": t})
out["field"] = field
out["field_source"] = "white list: script phrases + 20 neutral phrases (tools/bpe_tokens.py NEUTRAL)"
with open(os.path.join(root, "out", "field_tokens.txt"), "w") as f:
    f.write(f"# поле словаря: {len(field)} кусочков o200k (белый список), · — пробел\n")
    f.write("\n".join(f"{p['id']:>7}  {p['text'].replace(' ', '·')}" for p in field) + "\n")

# 6. strawberry в вопросе — для сверки (в кадре номер не показываем)
out["strawberry"] = {"text": " strawberry", "ids": e.encode(" strawberry")}

os.makedirs(os.path.join(root, "js"), exist_ok=True)
with open(os.path.join(root, "tokens.json"), "w") as f: json.dump(out, f, ensure_ascii=False, indent=1)
with open(os.path.join(root, "js", "tokens-data.js"), "w") as f:
    f.write("// generated by tools/bpe_tokens.py (tiktoken o200k_base) — do not edit\nwindow.TOK = ")
    json.dump(out, f, ensure_ascii=False)
    f.write(";\n")
q = " | ".join(f"{p['text'].replace(' ', '·')}={p['id']}" for p in out["question"]["pieces"])
print("question:", q)
print("merges:", " → ".join(f"{s['text'].replace(' ', '·')}={s['id']}(t{s['tier']})" for s in steps))
print("answer:", " | ".join(f"{p['text'].replace(' ', '·')}={p['id']}" for p in out["answer"]["pieces"]))
print("letters:", out["letters"])
print("burst:", len(burst), ", ".join(f"{p['text'].replace(' ', '·')}={p['id']}" for p in burst))
print("field:", len(field), "n_vocab:", e.n_vocab, "strawberry:", out["strawberry"]["ids"])
