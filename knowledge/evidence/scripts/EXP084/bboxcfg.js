const R=require('path').join(__dirname,'../../../../../solidworks-converters/src/');
const P=require(R+'parasolid/partition'),X=require(R+'parasolid/xt'),D=require(R+'display'),Z=require(R+'inflate'),fs=require('fs');
for(const f of process.argv.slice(2)){const raw=fs.readFileSync(f),s=P.streams(raw);const d=D.parseSLDPRT(raw,Z.inflateRaw,Z.inflate);
  const lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];for(const fc of d.faces)for(let i=0;i<fc.vertices.length;i+=3)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],fc.vertices[i+k]);hi[k]=Math.max(hi[k],fc.vertices[i+k]);}
  const rows=[];
  for(const k of Object.keys(s).filter(k=>/Contents\/Config-\d+-Partition$/.test(k))){const n=+/Config-(\d+)-/.exec(k)[1];
    try{const q=X.parse(P.sections(s[k],0).out[0].body,true);const pl=[1e9,1e9,1e9],ph=[-1e9,-1e9,-1e9];
      for(const x of q.nodes.filter(x=>x.type===29)){const p=x.values.pvec;for(let j=0;j<3;j++){pl[j]=Math.min(pl[j],p[j]);ph[j]=Math.max(ph[j],p[j]);}}
      const err=Math.max(...[0,1,2].map(j=>Math.max(Math.abs(pl[j]-lo[j]),Math.abs(ph[j]-hi[j]))));rows.push([n,err]);}catch(e){rows.push([n,NaN]);}}
  rows.sort((a,b)=>a[1]-b[1]);console.log(f.split('/').pop().slice(0,26),'dispF',d.faces.length,rows.slice(0,5).map(([n,e])=>`N=${n}:${(e*1000).toFixed(4)}mm`).join(' '));}
