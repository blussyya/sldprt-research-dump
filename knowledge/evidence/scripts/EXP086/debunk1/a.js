const R='/run/media/blus/1F7A-F408/projects/sldprt reverse engineering/solidworks-converters';
const fs=require('fs'),path=require('path');
const {readBrep}=require(R+'/src');const native=require(R+'/src/brep/native');const E=require(R+'/src/geom/eval');
const D='/run/media/blus/1F7A-F408/projects/sldprt reverse engineering/sldprt-research-dump/';
const files=[];
for(const d of fs.readdirSync(D+'test files online')){const p=D+'test files online/'+d;if(!fs.statSync(p).isDirectory())continue;for(const f of fs.readdirSync(p))if(/\.sldprt$/i.test(f))files.push(p+'/'+f);}
function walk(p,depth){if(depth>3)return;let st;try{st=fs.readdirSync(p,{withFileTypes:true});}catch(e){return;}for(const e of st){const q=p+'/'+e.name;if(e.isDirectory())walk(q,depth+1);else if(/\.sldprt$/i.test(e.name))files.push(q);}}
walk(D+'test files new',0);
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cr=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const out=[];const seenOff=new Set();
const stats={files:0,err:0,offsets:0,icurves:0};
for(const f of files){
  let m,parsed;
  try{parsed=readBrep(f).parsed;m=native.build(parsed);}catch(e){stats.err++;out.push({f,err:String(e.message).slice(0,80)});continue;}
  stats.files++;
  const curves=new Set();for(const e of m.edges.values()){let c=e.curve;if(c&&c.type==='trimmed')c=c.basis;if(c&&c.type==='intersection')curves.add(c);}
  // also intersection curves reachable from spcurves? no
  const done=new Set();
  for(const c of curves){stats.icurves++;
    c.surfaces.forEach((S,si)=>{
      if(S.type!=='offset')return;
      const B=S.basis;
      const rec={f:f.replace(D,''),curve:c.node,off:S.node,basisType:B.type,basisNode:B.node,d:S.d,offSense:S.sense,basisSense:B.sense,n:c.chart.length};
      if(!['plane','cylinder','cone','sphere','torus','bspline'].includes(B.type)){rec.skip=true;out.push(rec);return;}
      const vals=[];let oor=0;
      for(const p of c.chart){let r;try{r=E.surfaceInverse(B,p);}catch(e){rec.skip='inv';break;}
        let e0;try{e0=E.surfaceEval(B,r.u,r.v);}catch(e){rec.skip='ev';break;}
        const nrm=cr(e0.du,e0.dv);const L=Math.hypot(...nrm);if(!L){continue;}
        const s=dot(sub(p,e0.p),nrm)/L;vals.push(s);
        if(B.type==='bspline'){const [[u0,u1],[v0,v1]]=E.surfaceRange(B);const w=(B.uPeriodic||B.uClosed),w2=(B.vPeriodic||B.vClosed);
          if((!w&&(r.u<=u0+1e-9||r.u>=u1-1e-9))||(!w2&&(r.v<=v0+1e-9||r.v>=v1-1e-9)))oor++;}
      }
      rec.oor=oor;
      if(vals.length){rec.sMin=Math.min(...vals);rec.sMax=Math.max(...vals);const mean=vals.reduce((a,b)=>a+b)/vals.length;rec.mean=mean;
        rec.pass=0;}
      out.push(rec);
    });}
}
fs.writeFileSync('out.json',JSON.stringify({stats,out},null,0));
console.log(stats,out.length);
