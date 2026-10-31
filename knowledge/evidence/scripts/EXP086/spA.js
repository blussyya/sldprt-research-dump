const R=process.env.CONV||require('path').join(__dirname,'../../../../../solidworks-converters'),S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval');
const M=N.build(S.readBrep(process.argv[2]).parsed);
const seen=new Set();for(const f of M.faces.values()){const s=f.surface;if(!s||s.type!=='blend'||seen.has(s))continue;seen.add(s);let c=s.spine;if(c.type==='trimmed')c=c.basis;if(c.type!=='intersection')continue;
 const d=p=>c.surfaces.map(o=>{try{return (G.surfaceDistance(o,p).d*1e3).toFixed(4)}catch(e){return o.type}}).join('/');
 console.log('blend',s.node,'r',s.range[0],'A',d(c.start.p),'B',d(c.end.p),'chart',c.chart.map(d).join(' '),'surf',c.surfaces.map(o=>o.type+':'+(o.surface&&o.surface.type)+':'+o.d).join(','));}
