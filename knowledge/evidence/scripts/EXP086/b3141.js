// head_back blend 3141: its spine is plane 3140 ∩ blend 3139. What's blend 3139, and where are the
// spine's chart points relative to it (distance to 3139's own spine, against its radius)?
const R=process.env.CONV||require('path').join(__dirname,'../../../../../solidworks-converters'),S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),F=require(R+'/src/brep/fit');
const M=N.build(S.readBrep(process.argv[2]).parsed);let b;for(const f of M.faces.values())if(f.surface&&f.surface.node===3141){b=f.surface;break;}
let c=b.spine;if(c.type==='trimmed')c=c.basis;const B=c.surfaces[1];
let k=B.spine;if(k.type==='trimmed')k=k.basis;
const d=s=>s.type+s.node+(s.type==='offset'?' off '+s.d+' of '+d(s.basis):'');
console.log('blend 3139 range',B.range,'type',B.blendType,'sense',B.sense,'supports',B.surfaces.map(d),'spine',k.type,k.surfaces&&k.surfaces.map(d),'chart',k.chart&&k.chart.length,'start',k.start&&k.start.type,'end',k.end&&k.end.type);
const sp=F.spineOf(B,1e-10).curve,[t0,t1]=G.curveRange(sp);console.log('3139 spine range',t0,t1,'ends',G.curvePoint(sp,t0),G.curvePoint(sp,t1));
for(const p of c.chart){const t=G.curveProject(sp,p).t,q=G.curvePoint(sp,t);console.log('chart pt: t',t.toFixed(6),'dist to 3139 spine mm',(G.dist(p,q)*1e3).toFixed(6),'plane dist mm',(G.surfaceDistance(c.surfaces[0],p).d*1e3).toFixed(6));}
// the same distances by a dense scan of 3139's spine, not curveProject
for(const p of c.chart){let best=1e9,bt=0;for(let i=0;i<=20000;i++){const t=t0+(t1-t0)*i/20000,dd=G.dist(p,G.curvePoint(sp,t));if(dd<best){best=dd;bt=t;}}
  console.log('dense: t',bt.toFixed(5),'dist mm',(best*1e3).toFixed(6));}
console.log('3139 spine type',sp.type,'degree',sp.degree,'ctrl',sp.ctrl&&sp.ctrl.length,'periodic',G.periodic(sp));
// the closed spine's chart: where its ends are relative to the H limits, and the chord lengths
console.log('H start = end?',G.dist(k.start.p,k.end.p),'chart0-start',G.dist(k.chart[0],k.start.p),'chartN-start',G.dist(k.chart[k.chart.length-1],k.start.p));
console.log('chords mm',k.chart.slice(1).map((p,i)=>(G.dist(p,k.chart[i])*1e3).toFixed(3)).join(' '));
