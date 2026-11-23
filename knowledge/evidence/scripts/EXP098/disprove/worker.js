// worker.js <file> : per-candidate faces, box, gap (computed even when face count differs), STEP hash.
const fs=require('fs'),crypto=require('crypto');
const R='/home/user/solidworks-converters/src/';
const P=require(R+'parasolid/partition.js'),S=require(R+'parasolid/select.js'),D=require(R+'display.js');
const native=require(R+'brep/native'),Pr=require(R+'brep/procedural'),stepExport=require(R+'step/export');
const zlib=require('zlib');const iR=b=>zlib.inflateRawSync(b),iZ=b=>zlib.inflateSync(b);
const CODEC={inflateRaw:iR,inflate:iZ};const f=process.argv[2];const raw=fs.readFileSync(f);
const all=P.streams(raw);
const names=Object.keys(all).filter(k=>/Config-\d+-Partition$/.test(k)).sort((a,b)=>+/Config-(\d+)/.exec(a)[1]-+/Config-(\d+)/.exec(b)[1]);
const d=D.parseSLDPRT(raw,iR,iZ),want=S.displayBox(d);
const out={f,displayFaces:d.faces.length,displayBox:want,boundsMissing:d.faces.filter(x=>!x.bounds).length,rows:[]};
const skipStep=process.argv[3]==='nostep';
for(const n of names){
  const row={name:n};out.rows.push(row);
  try{
    const a=P.assemble(all,n,CODEC,{});const t0=Date.now();
    if(a.parsed.error){row.error=a.parsed.error;continue;}
    row.source=a.source;row.hidden=(a.parsed.hidden||[]).length;
    const r=S.brepBox(a.parsed);row.faces=r.faces;row.box=r.box;
    if(want){const g=[];for(let k=0;k<3;k++){g.push(Math.abs(r.box.min[k]-want.min[k]),Math.abs(r.box.max[k]-want.max[k]));}row.gap=Math.max(...g);}
    if(!skipStep){const t=stepExport.toSTEP(a.parsed,{}).text;row.stepLen=t.length;
      // hash with the header (timestamps/filenames) stripped
      const body=t.slice(t.indexOf('DATA;'));row.stepHash=crypto.createHash('sha1').update(body).digest('hex').slice(0,12);}
    row.ms=Date.now()-t0;
  }catch(e){row.error=e.message.slice(0,200);}
}
console.log(JSON.stringify(out));
