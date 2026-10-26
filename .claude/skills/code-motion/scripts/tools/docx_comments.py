# Comments of a .docx (unzipped word/ folder): id, author, date, the anchored text, the comment.
#   python3 -I tools/docx_comments.py <unzipped>/word
import re, sys, os, html
w = sys.argv[1]
txt = lambda x: html.unescape(''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', x)))
doc = open(os.path.join(w, 'document.xml'), encoding='utf8').read()
anch = {}
for cid in re.findall(r'commentRangeStart[^>]*w:id="(\d+)"', doc):
    m = re.search(r'commentRangeStart[^>]*w:id="%s"[^>]*/>(.*?)commentRangeEnd[^>]*w:id="%s"' % (cid, cid), doc, re.S)
    anch[cid] = txt(m.group(1)) if m else ''
p = os.path.join(w, 'comments.xml')
if not os.path.exists(p):
    print('no comments.xml'); sys.exit()
x = open(p, encoding='utf8').read()
for m in re.finditer(r'<w:comment ([^>]*)>(.*?)</w:comment>', x, re.S):
    a = dict(re.findall(r'w:(\w+)="([^"]*)"', m.group(1)))
    paras = [txt(q) for q in re.findall(r'<w:p[ >].*?</w:p>', m.group(2), re.S)]
    print(f"#{a.get('id')} {a.get('author', '?')} {a.get('date', '')}")
    if anch.get(a.get('id')): print(f"  on: «{anch[a.get('id')][:200]}»")
    print('  ' + '\n  '.join(p for p in paras if p.strip()) + '\n')
ids = sorted(int(m) for m in re.findall(r'<w:comment [^>]*w:id="(\d+)"', x))
if ids and ids != list(range(ids[0], ids[0] + len(ids))) or (ids and ids[0] != 0):
    print(f'NOTE: comment ids {ids}: gaps may be comments lost in export (e.g. on images); check the native file (iwa.py).')
