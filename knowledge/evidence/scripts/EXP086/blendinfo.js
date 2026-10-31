// head_back blend $NODE: what its spine's two surfaces are and where the 3-point chart lies.
const R=process.env.CONV||require('path').join(__dirname,'../../../../../solidworks-converters'),S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval');
const M=N.build(S.readBrep(process.argv[2]).parsed);let b;for(const f of M.faces.values())if(f.surface&&f.surface.node===+process.env.NODE){b=f.surface;break;}
let c=b.spine;if(c.type==='trimmed')c=c.basis;
const d=s=>s.type+s.node+(s.type==='offset'?' off '+s.d+' of '+d(s.basis):s.type==='cylinder'?' r '+s.r+' axis '+s.a+' at '+s.p:s.type==='swept'?' dir '+s.d+' curve '+s.curve.type:s.type==='spun'?' axis '+s.a+' curve '+s.curve.type:'');
console.log('supports',b.surfaces.map(d));console.log('spine',c.surfaces.map(d));
console.log('start',JSON.stringify(c.start),'end',JSON.stringify(c.end));console.log('chart',JSON.stringify(c.chart));
console.log('chart span mm',c.chart.slice(1).map((p,i)=>(G.dist(p,c.chart[i])*1e3).toFixed(3)),'start-end mm',(G.dist(c.start.p,c.end.p)*1e3).toFixed(3));
