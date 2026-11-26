// Claim 1's "labelled boundary edges lie on the native edge curves they name", taken literally:
// distance from each labelled display point of faces 75 and 448 to the native edge with the SAME id
// (whole curve and the edge's own branch), next to the native edge one id lower.
// Control: face 75's labels (no shift expected) at ~0.
const L=require('./lib'),S=require(L.R+'/src'),N=require(L.R+'/src/brep/native'),G=require(L.R+'/src/geom/eval'),B=require('./branch'),fs=require('fs');
const file='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const buf=fs.readFileSync(file),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed);
const whole=e=>{const c=e.curve.type==='trimmed'?e.curve.basis:e.curve;if(c.type==='line')return [G.curvePoint(c,-1),G.curvePoint(c,1)];return B.branch(M,{...e,v:null},false,720);};
for(const di of [75,448]){const f=d.faces[di];const {E}=L.meshEdges(f);
  const labs=[...new Set([...E].flatMap(([p,e])=>e.uses===1?e.ids.filter(x=>x):[]))].sort((a,b)=>a-b);
  for(const lab of labs){const pts=[...new Set([...E].filter(([p,e])=>e.uses===1&&e.ids.includes(lab)).flatMap(([p])=>p.split('|')))].map(L.P);
    const row=[];for(const nid of [lab,lab-1,lab+1]){const e=M.edges.get(nid);if(!e){row.push(nid+':none');continue;}
      let w=NaN,b=NaN;try{w=Math.max(...pts.map(p=>B.polyDist(whole(e),p)));}catch(_){}try{const br=B.branch(M,e,false);if(br)b=Math.max(...pts.map(p=>B.polyDist(br,p)));}catch(_){}
      const faces=M.faces.filter(x=>x.loops.some(l=>l.coedges.some(c=>c.edge===nid))).map(x=>x.id+':'+x.surface.type);
      row.push(nid+' '+e.curve.type+(e.v?'':'(ring)')+' curve '+w.toExponential(1)+' branch '+b.toExponential(1)+' faces '+faces.join(','));}
    console.log('display',di,'label',lab,'pts',pts.length,'|',row.join(' | '));}}
