const L=require('./lib');
const {d,M,j}=L.load(process.argv[2]);
const fi=+process.argv[3];const df=d.faces[fi],nf=j[fi].face,s=nf.surface;
console.log('surface',JSON.stringify({p:s.p,a:s.a,r:s.r,type:s.type,angle:s.angle}));
for(const lp of nf.loops)for(const c of lp.coedges){const e=M.edges.get(c.edge);console.log('edge',e.id,e.curve.type,JSON.stringify(e.curve.type==='circle'?{c:e.curve.c,r:e.curve.r,n:e.curve.n}:{}),'v',e.v);}
// ids per vertex
const ids=new Map();for(const e of df.edgeAnnotations)if(e.id){for(const v of e.vertices){if(!ids.has(v))ids.set(v,new Set());ids.get(v).add(e.id);}}
// axial coordinate & radial residual
const rows=[];for(let i=0;i<df.vertexCount;i++){const p=L.V(df,i);const q=L.sub(p,s.p);const h=L.dot(q,s.a);rows.push({i,h:+h.toFixed(7),r:L.dSurf(s,p),ids:[...(ids.get(i)||[])].join('/')});}
const off=rows.filter(x=>Math.abs(x.r)>1e-9);
const hs={};for(const x of rows){const k=x.h+'|'+x.ids;hs[k]=hs[k]||{n:0,off:0,rmax:0};hs[k].n++;if(Math.abs(x.r)>1e-9)hs[k].off++;hs[k].rmax=Math.max(hs[k].rmax,Math.abs(x.r));}
console.log(hs);
