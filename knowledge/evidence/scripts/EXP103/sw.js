// EXP-103: what is the surface under offset N? usage: node sw.js part blendnode
const R=process.env.CONV||'/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval');
const n=N.build(S.readBrep(process.argv[2]).parsed);const f=n.faces.find(f=>f.surface.node===+process.argv[3]);let c=f.surface.spine;if(c.type==='trimmed')c=c.basis;
for(const s of c.surfaces){const b=s.basis||s;console.log(s.type+s.node,'basis',b.type,b.type==='swept'?{curve:b.curve.type,deg:b.curve.degree,n:b.curve.ctrl&&b.curve.ctrl.length,range:G.curveRange(b.curve),d:b.d}:'',s.d);
 if(b.type==='swept'&&b.curve.type==='bspline'){const [t0,t1]=G.curveRange(b.curve);for(const t of [t0,t1]){const e=G.curveTangent(b.curve,t),h=1e-4*(t1-t0),e2=G.curveTangent(b.curve,Math.min(t1,Math.max(t0,t+(t===t0?h:-h))));console.log('  t',t,'|C\'|',G.norm(e),'tangent turn over',h,'param:',Math.acos(Math.min(1,G.dot(G.unit(e),G.unit(e2)))));}}}
