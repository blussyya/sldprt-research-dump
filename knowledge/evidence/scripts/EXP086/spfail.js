const R=process.env.CONV||require('path').join(__dirname,'../../../../../solidworks-converters'),S=require(R+'/src'),N=require(R+'/src/brep/native'),P=require(R+'/src/brep/procedural'),F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval');
const o=F.blendSurface;F.blendSurface=function(b){try{return o.apply(this,arguments)}catch(x){console.log("err",x.message,Object.keys(b));let c=b.spine;if(!c)throw x;if(c.type==='trimmed')c=c.basis;
 const d=(a,q)=>a&&q?G.dist(a,q):null;console.log('spine type',c.type);console.log('blend',b.node,b.blendType,b.range,'spine surfs',c.surfaces.map(s=>s.type+s.node).join(" "),'A',c.start&&c.start.p,'B',c.end&&c.end.p,'chart n',c.chart.length,'A-chart0',d(c.start&&c.start.p,c.chart[0]),'B-chartN',d(c.end&&c.end.p,c.chart[c.chart.length-1]),'AB',d(c.start&&c.start.p,c.end&&c.end.p));
 try{console.log('chartMarch->',F._chartPoly?'':'(no export)')}catch(e){}
 throw x;}};
try{P.resolve(N.build(S.readBrep(process.argv[2]).parsed));console.log('ok')}catch(e){console.log('final',e.message)}
