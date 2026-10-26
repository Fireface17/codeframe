# Decompress Apple iWork .iwa (snappy chunks, no CRC) and print readable UTF-8 strings: the raw
# text and comments of a .pages file, even without the Pages app.  python3 -I iwa.py Document.iwa ...
import sys, re
def snappy(b):
    i=0; n=0; s=0
    while True:
        c=b[i]; i+=1; n|=(c&0x7f)<<s; s+=7
        if c<0x80: break
    out=bytearray()
    while i<len(b):
        t=b[i]; i+=1; k=t&3
        if k==0:
            L=t>>2
            if L>=60:
                nb=L-59; L=int.from_bytes(b[i:i+nb],'little'); i+=nb
            L+=1; out+=b[i:i+L]; i+=L
        else:
            if k==1: L=((t>>2)&7)+4; off=((t>>5)<<8)|b[i]; i+=1
            elif k==2: L=(t>>2)+1; off=int.from_bytes(b[i:i+2],'little'); i+=2
            else: L=(t>>2)+1; off=int.from_bytes(b[i:i+4],'little'); i+=4
            for _ in range(L): out.append(out[-off])
    return bytes(out)
def iwa(path):
    d=open(path,'rb').read(); i=0; out=b''
    while i<len(d):
        L=int.from_bytes(d[i+1:i+4],'little'); out+=snappy(d[i+4:i+4+L]); i+=4+L
    return out
for p in sys.argv[1:]:
    raw=iwa(p)
    txt=raw.decode('utf8','ignore')
    print('=====',p,len(raw))
    for m in re.finditer(r'[^\x00-\x08\x0b-\x1f\x7f-\x9f�]{6,}',txt):
        s=m.group(0).strip()
        if re.search(r'[A-Za-zА-Яа-я]{3}',s): print(repr(s[:600]))
