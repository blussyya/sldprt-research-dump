"""Independent OLE FAT/mini-FAT reader for the supplied 2011 corpus; stdlib only."""
import hashlib,json,struct,zlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def sha(b): return hashlib.sha256(b).hexdigest()
def extract(b):
    assert b[:8]==bytes.fromhex('d0cf11e0a1b11ae1')
    u=lambda o:struct.unpack_from('<I',b,o)[0]
    ss=1<<struct.unpack_from('<H',b,30)[0]
    ms=1<<struct.unpack_from('<H',b,32)[0]
    def sector(i):
        assert i<0xfffffffa and (i+2)*ss<=len(b)
        return b[(i+1)*ss:(i+2)*ss]
    ids=list(struct.unpack_from('<109I',b,76));nxt=u(68)
    for _ in range(u(72)):
        words=struct.unpack('<'+'I'*(ss//4),sector(nxt));ids.extend(words[:-1]);nxt=words[-1]
    fat=[]
    for i in [i for i in ids if i<0xfffffffa][:u(44)]:fat.extend(struct.unpack('<'+'I'*(ss//4),sector(i)))
    def chain(start,table,get):
        out=[];seen=set();i=start
        while i<0xfffffffa:
            assert i not in seen and i<len(table),'invalid sector chain'
            seen.add(i);out.append(get(i));i=table[i]
        return b''.join(out)
    directory=chain(u(48),fat,sector);entries=[]
    for o in range(0,len(directory),128):
        d=directory[o:o+128];ln=struct.unpack_from('<H',d,64)[0]
        if d[66] not in (2,5):continue
        assert 2<=ln<=64
        entries.append((d[:ln-2].decode('utf-16le'),d[66],struct.unpack_from('<I',d,116)[0],struct.unpack_from('<Q',d,120)[0]))
    root=next(e for e in entries if e[1]==5);mini=chain(root[2],fat,sector)[:root[3]]
    mf=chain(u(60),fat,sector) if u(64) else b'';mfat=list(struct.unpack('<'+'I'*(len(mf)//4),mf))
    def stream(e):
        return (chain(e[2],mfat,lambda i:mini[i*ms:(i+1)*ms]) if e[3]<u(56) else chain(e[2],fat,sector))[:e[3]]
    pe=[e for e in entries if e[0]=='Config-0-Partition'];assert len(pe)==1
    return stream(pe[0]),[e[0] for e in entries]
rows=[]
for file in sorted((ROOT/'test files new/SW2011').rglob('*.SLDPRT')):
    raw=file.read_bytes();part,names=extract(raw)
    assert part[4:20]==bytes.fromhex('231dd571da8148a2a85898b21b89ef99')
    inner=zlib.decompress(part[28:]);assert inner[:2]==b'PS'
    n=struct.unpack_from('>I',inner,2)[0];description=inner[6:6+n].decode('ascii');p=6+n
    n=struct.unpack_from('>I',inner,p)[0];schema=inner[p+4:p+4+n].decode('ascii')
    rows.append(dict(file=str(file.relative_to(ROOT)),sha256=sha(raw),partitionSHA256=sha(part),inflatedSHA256=sha(inner),description=description,schema=schema,displayNames=[n for n in names if 'DisplayLists' in n]))
assert len(rows)==25
result=dict(scriptSHA256=sha(Path(__file__).read_bytes()),files=len(rows),method='Independent stdlib FAT/mini-FAT traversal, exact inner zlib offset 28, independently read PS lengths. No node/DisplayLists decode.',rows=rows)
(ROOT/'v0.4.9/EXP062_LEGACY_RESULTS.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(dict(files=len(rows),schemas=sorted(set(r['schema'] for r in rows)))))
