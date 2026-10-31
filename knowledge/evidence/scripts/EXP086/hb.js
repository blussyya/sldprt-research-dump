const R=process.env.CONV||require('path').join(__dirname,'../../../../../solidworks-converters'),S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval');
const M=N.build(S.readBrep(process.argv[2]).parsed);let b;for(const f of M.faces.values())if(f.surface&&f.surface.node===10239){b=f.surface;break;}
let c=b.spine;console.log('spine',c.type,c.basis&&c.basis.type,c.type==='trimmed'?[c.t0,c.t1,c.p0,c.p1]:'');if(c.type==='trimmed')c=c.basis;
console.log('surfs',c.surfaces&&c.surfaces.map(s=>s.type+s.node),'start',JSON.stringify(c.start),'end',JSON.stringify(c.end),'chart',c.chart&&c.chart.length);
console.log('blend start/end',JSON.stringify(b.start),JSON.stringify(b.end),'supports',b.surfaces.map(s=>s.type+s.node));
const ch=c.chart;if(ch){console.log('chart0',ch[0],'chartN',ch[ch.length-1]);}
console.log('face pt0 dist to chart ends',ch&&G.dist([0.043931972258025614,0.08469804621726396,-0.02279126177910637],ch[0]),ch&&G.dist([0.043931972258025614,0.08469804621726396,-0.02279126177910637],ch[ch.length-1]));
const F=require(R+'/src/brep/fit'),sp=F.spineOf(b,1e-8).curve,E=G.curvePoint(sp,1),T=G.unit(G.curveTangent(sp,1));
const face=[...M.faces.values()].find(f=>f.id===10183);const pts=[];
for(const l of face.loops)for(const co of l.coedges){const e=M.edges.get(co.edge);let c=e.curve;if(c.type==='trimmed')c=c.basis;console.log('edge',e.id,c.type,c.surfaces?c.surfaces.map(s=>s.type+s.node):'',e.v);if(e.v)for(const v of e.v)pts.push(M.vertices.get(v).p);}
for(const q of pts){const d=G.sub(q,E);console.log('along',(G.dot(d,T)*1e3).toFixed(4),'mm  dist',(G.norm(d)*1e3).toFixed(4));}
console.log('spine end vs limit p',G.dist(E,c.end.p)*1e3,'mm');
