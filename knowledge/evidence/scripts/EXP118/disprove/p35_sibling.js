// Bores of radius 1.35 mm in a part: loops (edge types), loop windings. For head_back as a sibling
// of head_face: does the same bore exist there, and is its second loop closed round the axis?
const L=require('./lib'),S=require(L.R+'/src'),N=require(L.R+'/src/brep/native'),G=require(L.R+'/src/geom/eval'),B=require('./branch'),fs=require('fs');
const file=process.argv[2],R=+(process.argv[3]||1.35e-3);
const M=N.build(S.readBrep(fs.readFileSync(file)).parsed);
for(const f of M.faces){const s=f.surface;if(s.type!=='cylinder'||Math.abs(s.r-R)>1e-9)continue;const y=G.cross(s.a,s.x),th=p=>{const q=G.sub(p,s.p);return Math.atan2(G.dot(q,y),G.dot(q,s.x));};
  const ls=f.loops.map(l=>{let t=0,ok=true;const tp=[];for(const c of l.coedges){const e=M.edges.get(c.edge);tp.push(c.edge+':'+(e.curve.basis?e.curve.basis.type:e.curve.type)+(e.v?'':'(ring)'));let ps=null;try{ps=B.branch(M,e,false,128);}catch(_){}if(!ps){ok=false;continue;}if(!c.sense)ps=ps.slice().reverse();for(let i=1;i<ps.length;i++){let a=th(ps[i])-th(ps[i-1]);while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;t+=a;}}
    return tp.join('+')+' w='+(ok?(t*180/Math.PI).toFixed(0):'?');});
  console.log('face',f.id,'centre',s.p.map(x=>(x*1000).toFixed(2)).join(','),'axis',s.a.map(x=>x.toFixed(3)).join(','),'|',ls.join(' | '));}
