// Claim 2's direction argument, measured: for the bore loops' circle and intersection edges, the
// distance of SolidWorks' display points labelled with that edge (labels of the matching native
// edge, so 1166/1093 on face 75 and 11125/11136 on face 448) to the edge's branch as the reader
// orients it, and to the opposite branch. Also how much of the branch the display covers.
// Control: the ring 1165 / 11112 lies at ~0 on its circle either way.
const L=require('./lib'),S=require(L.R+'/src'),N=require(L.R+'/src/brep/native'),G=require(L.R+'/src/geom/eval'),B=require('./branch'),fs=require('fs');
const file='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const buf=fs.readFileSync(file),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed);
const pairs=[[75,[[1166,1166],[1093,1093],[1165,1165]]],[448,[[11125,11124],[11136,11135],[11112,11111]]],[56,[[1093,1093]]],[72,[[1166,1166]]]];
for(const [di,list] of pairs){const f=d.faces[di];const {E}=L.meshEdges(f);
  for(const [lab,nid] of list){const segs=[...E].filter(([p,e])=>e.uses===1&&e.ids.includes(lab)).map(([p])=>p);
    const pts=[...new Set(segs.flatMap(s=>s.split('|')))].map(L.P),mids=segs.map(s=>{const [a,b]=s.split('|').map(L.P);return G.mul(G.add(a,b),0.5);});
    const e=M.edges.get(nid);
    for(const flip of [false,true]){const br=B.branch(M,e,flip);if(!br){console.log(di,lab,'->',nid,'flip',flip,'no branch');continue;}
      const dv=pts.map(p=>B.polyDist(br,p)),maxd=Math.max(...dv);
      // coverage: fraction of branch sample points within 2e-5 of a display segment
      const cov=br.filter(q=>segs.some(s=>{const [a,b]=s.split('|').map(L.P);return B.polyDist([a,b],q)<2e-5;})).length/br.length;
      let len=0;for(let i=1;i<br.length;i++)len+=G.dist(br[i-1],br[i]);
      console.log('display',di,'label',lab,'native',nid,e.curve.type,flip?'OPPOSITE sense':'reader sense  ','branch length',(len*1000).toFixed(3),'mm  display pts',pts.length,'max dist to branch',maxd.toExponential(2),'branch covered by display',(100*cov).toFixed(0)+'%');}
  }}
