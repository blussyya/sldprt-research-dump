const file=process.argv[2];
const R="/run/media/blus/1F7A-F408/projects/sldprt reverse engineering/solidworks-converters";
const S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval');
const Fn=require('./fit_new.js'),Fo=require('./fit_old.js');
const M=N.build(S.readBrep(file).parsed);
const base=file.split('/').pop();
function devc(c1,c2){ // max dist of c1 samples to c2
  let m=0;const [a,b]=G.curveRange(c1);for(let i=0;i<=400;i++){const p=G.curvePoint(c1,a+(b-a)*i/400);m=Math.max(m,G.curveProject(c2,p).d);}return m;}
const out=[];
function rec(kind,id,info,fnNew,fnOld){
  global.__rej=[];global.__ok=0;let rn,ro,en,eo;
  const t0=Date.now();try{rn=fnNew();}catch(e){en=String(e.message).slice(0,60)}const tn=Date.now()-t0;const rej=global.__rej.slice(),ok=global.__ok;
  const t1=Date.now();try{ro=fnOld();}catch(e){eo=String(e.message).slice(0,60)}const to=Date.now()-t1;
  const row={file:base,kind,id,info,tn,to,nrej:rej.length,nok:ok,en,eo,errNew:rn&&rn.error,errOld:ro&&ro.error};
  if(rej.length)row.rej=rej.slice(0,6);
  if(rn&&ro&&rn.curve&&ro.curve&&rn.curve.type==='bspline'&&ro.curve.type==='bspline'){try{row.devNO=devc(rn.curve,ro.curve);row.devON=devc(ro.curve,rn.curve);}catch(e){}}
  console.log(JSON.stringify(row));
}
const seen=new Set();
for(const e of M.edges.values()){
  let c=e.curve;if(c.type==='trimmed')c=c.basis;
  if(c.type!=='intersection'||!c.surfaces||c.surfaces.some(s=>s.type==='blendBound'))continue;
  if(seen.has(c))continue;seen.add(c);
  const p0=e.v?M.vertices.get(e.v[0]).p:null,p1=e.v?M.vertices.get(e.v[1]).p:null;
  const fix=r=>r&&{curve:r.curve,error:r.error};
  rec('edge',e.id,c.surfaces.map(s=>s.type[0]+s.node).join('x'),()=>fix(Fn.edgeCurve(e,c,p0,p1,{tolerance:1e-8})),()=>fix(Fo.edgeCurve(e,c,p0,p1,{tolerance:1e-8})));
}
for(const f of M.faces.values()){const s=f.surface;if(!s||s.type!=='blend'||seen.has(s))continue;seen.add(s);
  let c=s.spine;if(c.type==='trimmed')c=c.basis;if(c.type!=='intersection')continue;
  rec('spine',f.id,'blend'+s.node+' '+c.surfaces.map(q=>q.type[0]+q.node).join('x')+' '+(c.start&&c.start.type)+(c.end&&c.end.type),()=>Fn.spineOf({...s},1e-8),()=>Fo.spineOf({...s},1e-8));}
