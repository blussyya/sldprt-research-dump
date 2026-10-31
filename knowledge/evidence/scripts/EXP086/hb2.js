// Resolve head_back and print where it stops, with the stack.
const R=process.env.CONV||require('path').join(__dirname,'../../../../../solidworks-converters'),S=require(R+'/src'),N=require(R+'/src/brep/native'),P=require(R+'/src/brep/procedural'),F=require(R+'/src/brep/fit');
const em=F.edgeCurve;let cur=null;
F.edgeCurve=function(e,c,...a){cur=e;return em.call(this,e,c,...a);};
const bm=F.blendSurface;let nb=0;const t0=Date.now();F.blendSurface=function(b,...a){if(process.env.EVERY)console.log("start",b.node,((Date.now()-t0)/1e3).toFixed(0)+"s");try{const r=bm.call(this,b,...a);if(++nb%20===0||process.env.EVERY)console.log("blend",nb,b.node,((Date.now()-t0)/1e3).toFixed(0)+"s");return r;}catch(x){let c=b.spine;if(c.type==="trimmed")c=c.basis;console.log("blend",b.node,"r",b.range,"spine",c.type,c.surfaces&&c.surfaces.map(s=>s.type+s.node),"start",c.start&&c.start.type,"end",c.end&&c.end.type,"chart",c.chart&&c.chart.length);throw x;}};
try{P.resolve(N.build(S.readBrep(process.argv[2]).parsed));console.log('ok');}
catch(x){console.log(x.stack.split('\n').slice(0,8).join('\n'));if(cur){let c=cur.curve;if(c.type==='trimmed')c=c.basis;console.log('last edge',cur.id,c.type,c.surfaces&&c.surfaces.map(s=>s.type+s.node),'v',cur.v,'start',c.start&&c.start.type,'end',c.end&&c.end.type,'chart',c.chart&&c.chart.length);}}
