const fs=require('fs'),path=require('path');
const C='/home/user/solidworks-converters/src/';
const P=require(C+'parasolid/partition'),idx=require(C+'index');
const root='/home/user/sldprt-research-dump';
function walk(d,o=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,o);else if(/\.sldprt$/i.test(e.name))o.push(p);}return o;}
const files=['test files original','test files new','test files online'].flatMap(d=>walk(path.join(root,d)));
const out=[];
for(const f of files){
  try{
    const raw=fs.readFileSync(f);const s=P.streams(raw);
    const parts=Object.keys(s).filter(k=>/Config-\d+-Partition$/.test(k));
    const hdrs=Object.keys(s).filter(k=>/Config-\d+-ModelHeader$/.test(k));
    out.push({f,size:raw.length,parts,hdrs:hdrs.length,h2:!!s.Header2});
  }catch(e){out.push({f,err:e.message});}
}
fs.writeFileSync(__dirname+'/enum.json',JSON.stringify(out,null,1));
console.log('total',out.length,'err',out.filter(x=>x.err).length);
console.log('multi-part',out.filter(x=>x.parts&&x.parts.length>1).length,'multi no hdr',out.filter(x=>x.parts&&x.parts.length>1&&!x.hdrs).length,'multi with hdr',out.filter(x=>x.parts&&x.parts.length>1&&x.hdrs).length);
for(const x of out.filter(x=>x.parts&&x.parts.length>1))console.log(x.hdrs,x.parts.length,x.size,x.f.replace(root+'/',''));
