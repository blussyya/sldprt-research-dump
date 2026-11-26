// Claim 2: does any native edge cover the rest of the bore's end circle (the 264 degrees edge 1166
// doesn't), or lie on the bore cylinder below the lens at all? Every edge of the body is sampled along
// its own branch (reader sense; lines between vertices). Reported: edges with samples on the end
// circle outside edge 1166's arc, and edges with samples on the cylinder with h < -6.0 mm.
// Control: edge 1166 itself must show up on the circle inside its arc, edge 1093 on the cylinder.
const L=require('./lib'),S=require(L.R+'/src'),N=require(L.R+'/src/brep/native'),G=require(L.R+'/src/geom/eval'),B=require('./branch'),fs=require('fs');
const file='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const nfid=+(process.argv[2]||2516),arcId=+(process.argv[3]||1166);
const buf=fs.readFileSync(file),M=N.build(S.readBrep(buf).parsed);
const cyl=M.faces.find(f=>f.id===nfid).surface,y=G.cross(cyl.a,cyl.x);
const cc=p=>{const q=G.sub(p,cyl.p);return {th:Math.atan2(G.dot(q,y),G.dot(q,cyl.x))*180/Math.PI,h:G.dot(q,cyl.a)*1000,dr:Math.hypot(G.dot(q,cyl.x),G.dot(q,y))-cyl.r};};
const arc=B.branch(M,M.edges.get(arcId),false).map(cc),hEnd=arc[0].h;
const ths=arc.map(o=>o.th),inArc=th=>{// arc is short; test by nearest arc sample angle
  return ths.some(t=>{let d=Math.abs(t-th)%360;if(d>180)d=360-d;return d<0.5;});};
const onCircle={},onCyl={},nbTypes={};let noBranch=0;
for(const e of M.edges.values()){let br=null;try{br=B.branch(M,e,false,512);}catch(_){}if(!br){noBranch++;// fall back to the whole curve (or its chart / its fins' curves)
    const c=e.curve;const cs=[c,...(e.pcurves||[]).map(x=>x.curve)];br=[];
    for(const C of cs){try{if(C.type==='intersection')br.push(...C.chart.map(x=>x.slice(0,3)));else{const [a,b]=G.curveRange(C);for(let i=0;i<=512;i++)br.push(G.curvePoint(C,a+(b-a)*i/512));}}catch(_){}}
    nbTypes[c.type+(c.basis?'/'+c.basis.type:'')+':'+(br.length?'sampled':'none')]=(nbTypes[c.type+(c.basis?'/'+c.basis.type:'')+':'+(br.length?'sampled':'none')]||0)+1;if(!br.length)continue;}
  // densify lines
  if(br.length===2){const [a,b]=br;br=Array.from({length:65},(_,i)=>G.add(a,G.mul(G.sub(b,a),i/64)));}
  for(const p of br){const o=cc(p);if(Math.abs(o.dr)>1e-6)continue;
    if(Math.abs(o.h-hEnd)<1e-6&&!inArc(o.th))onCircle[e.id]=(onCircle[e.id]||0)+1;
    if(Math.abs(o.h-hEnd)<1e-6&&inArc(o.th)&&e.id===arcId)onCircle['control '+e.id]=(onCircle['control '+e.id]||0)+1;
    if(o.h<hEnd+0.2&&o.h>hEnd-2.5)onCyl[e.id]=(onCyl[e.id]||0)+1;}}
console.log('edges',M.edges.size,'no branch',noBranch,JSON.stringify(nbTypes),'end circle h',hEnd.toFixed(4),'mm');
console.log('samples on the end circle outside the arc (edge:count):',JSON.stringify(onCircle));
console.log('samples on the cylinder within h_end+0.2 .. h_end-2.5 mm (edge:count):',JSON.stringify(onCyl));
