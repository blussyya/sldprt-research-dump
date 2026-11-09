// EXP-112: read every modern file through its directory and compare with the converter's
// signature scan. Also collects layout statistics for the write-up.
const fs=require('fs'),path=require('path'),zlib=require('zlib'),analyse=require('./eocd.js');
const root='/home/user/sldprt-research-dump';
const modern=require('/home/user/solidworks-converters/src/container/modern.js');
function crc32(b){let c=~0;for(let i=0;i<b.length;i++){c^=b[i];for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xEDB88320:0);}return ~c>>>0;}
function walk(d,o=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory()){if(e.name!=='.git')walk(p,o);}else if(/\.sldprt$/i.test(e.name))o.push(p);}return o;}
const T={files:0,entries:0,empty:0,inflated:0,crcOk:0,hdrMismatch:0,nameSets:0,bytesSame:0,scanOnly:0,dirOnly:0,gap:{},firstLho:[],cFixed:{},lFixed:{},dupNames:0,stamp:{},order:0,contig:0,tailJunk:[],sizeIdentity:0};
const seen=new Set();
for(const f of walk(root)){const r=analyse(f);if(!r)continue;if(seen.has(r.head))continue;seen.add(r.head);
  const b=fs.readFileSync(f),key=b[7]&7,rol=x=>((x<<key)|(x>>>(8-key)))&255;
  const c=r.cands.find(c=>c.ok);T.files++;
  let p=c.off+8,prevEnd=null,dir={},sorted=true,prevLho=-1;
  for(let k=0;k<c.n;k++){
    const nl=b.readUInt16LE(p+28),lho=b.readUInt32LE(p+42),h=lho+8;
    const name=[...b.subarray(p+46,p+46+nl)].map(x=>String.fromCharCode(rol(x))).join('');
    const fixedC=[b.readUInt16LE(p+4),b.readUInt16LE(p+6),b.readUInt16LE(p+8),b.readUInt16LE(p+10),b.readUInt16LE(p+30),b.readUInt16LE(p+32),b.readUInt16LE(p+34),b.readUInt16LE(p+36),b.readUInt32LE(p+38)].join(',');
    T.cFixed[fixedC]=(T.cFixed[fixedC]||0)+1;
    const fixedL=[b.readUInt16LE(h+4),b.readUInt16LE(h+6),b.readUInt16LE(h+8),b.readUInt16LE(h+28)].join(',');T.lFixed[fixedL]=(T.lFixed[fixedL]||0)+1;
    const st=b.readUInt32LE(p+12).toString(16);
    // local header must repeat the central record's stamp, crc, sizes and name
    const same=b.readUInt32LE(h+10)===b.readUInt32LE(p+12)&&b.readUInt32LE(h+14)===b.readUInt32LE(p+16)&&b.readUInt32LE(h+18)===b.readUInt32LE(p+20)&&b.readUInt32LE(h+22)===b.readUInt32LE(p+24)&&b.readUInt16LE(h+26)===nl&&b.subarray(h+30,h+30+nl).equals(b.subarray(p+46,p+46+nl));
    if(!same)T.hdrMismatch++;
    const cs=b.readUInt32LE(p+20),us=b.readUInt32LE(p+24),ds=h+30+nl;
    if(lho<prevLho)sorted=false;prevLho=lho;
    if(prevEnd!==null){const g=lho-prevEnd;T.gap[g]=(T.gap[g]||0)+1;}else T.firstLho.push(lho);
    prevEnd=ds+cs;
    T.entries++;if(name in dir)T.dupNames++;
    let data=null;try{data=zlib.inflateRawSync(b.subarray(ds,ds+cs));}catch(e){}
    if(data&&data.length===us){T.inflated++;if(crc32(data)===b.readUInt32LE(p+16))T.crcOk++;}
    if(us===0)T.empty++;
    dir[name]=data;
    p+=46+nl;
  }
  if(sorted)T.order++;
  const g=c.off-prevEnd;T.gap['last->dir '+(g)]=(T.gap['last->dir '+g]||0)+1;
  T.tailJunk.push(b.length-(c.at+22));
  // compare with the scan (it keeps nonempty streams only)
  const scan=modern.decompressOpenSX(b,zlib.inflateRawSync,zlib.inflateSync);
  const dn=Object.keys(dir).filter(n=>dir[n]&&dir[n].length>0).sort(),sn=Object.keys(scan).sort();
  if(dn.join('\n')===sn.join('\n'))T.nameSets++;else{T.scanOnly+=sn.filter(n=>!dn.includes(n)).length;T.dirOnly+=dn.filter(n=>!sn.includes(n)).length;console.log('name sets differ',path.relative(root,f),'scan only',sn.filter(n=>!dn.includes(n)),'dir only',dn.filter(n=>!sn.includes(n)));}
  if(dn.every(n=>scan[n]&&Buffer.from(scan[n]).equals(dir[n])))T.bytesSame++;
}
const mm=a=>[Math.min(...a),Math.max(...a)];
T.firstLho=mm(T.firstLho);T.tailJunk=mm(T.tailJunk);
console.log(JSON.stringify(T,null,1));
