import sys,difflib,re
def load(f):
    L=[]
    for line in open(f):
        m=re.match(r'\s*(\d+) (\s*)(\S+) ?(.*)',line.rstrip('\n'))
        if m:L.append((int(m.group(1)),m.group(3),m.group(4)))
    return L
a=load(sys.argv[1]);b=load(sys.argv[2])
ka=[x[1]+' '+x[2] for x in a];kb=[x[1]+' '+x[2] for x in b]
sm=difflib.SequenceMatcher(None,ka,kb,autojunk=False)
lo=int(sys.argv[3]) if len(sys.argv)>3 else 0
for tag,i1,i2,j1,j2 in sm.get_opcodes():
    if tag=='equal':
        print(f'   = {i2-i1} same fields ({a[i1][0]}..{a[i2-1][0]} | {b[j1][0]}..{b[j2-1][0]})');continue
    for i in range(i1,i2):print(f'  A {a[i][0]:6} {ka[i][:150]}')
    for j in range(j1,j2):print(f'  B {b[j][0]:6} {kb[j][:150]}')
