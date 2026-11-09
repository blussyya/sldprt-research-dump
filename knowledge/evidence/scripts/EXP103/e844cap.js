// EXP-103: capture edge 844's resolved SP_CURVE during a resolve, then refit it alone with fitPoints and show the error.
// usage: CONV=<repo> node e844.js part edgeId
const R=process.env.CONV||'/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),P=require(R+'/src/brep/procedural'),F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval');
let cap=null;const em=F.edgeCurve;F.edgeCurve=function(e,c,p0,p1,o){if(e.id===+process.argv[3])cap={e,c,p0,p1,o};return em.call(this,e,c,p0,p1,o);};
try{P.resolve(N.build(S.readBrep(process.argv[2]).parsed));}catch(x){console.log('resolve threw',x.message);}
const {e,c,p0,p1,o}=cap;require('fs').writeFileSync(__dirname+'/e'+process.argv[3]+'-capture.json',JSON.stringify({c,p0,p1,sameSense:e.sameSense,id:e.id}));
process.exit(0);console.log('surface',c.surface.type,'c2 ctrl',c.c2.ctrl.length,'range',G.curveRange(c),'ends',p0,p1);
const r=F.edgeCurve(e,c,p0,p1,o);console.log('edgeCurve error',r.error.toExponential(3),'t0,t1',r.t0,r.t1,'ctrl',r.curve.ctrl.length);
// independent check: 20001 points of the SP_CURVE on its (fitted) surface against the fitted curve, either orientation of the parameter
const [a,b]=G.curveRange(c),[ra,rb]=G.curveRange(r.curve);let worst=0,at=0;
for(let i=0;i<=20000;i++){const f=i/20000,q=G.curvePoint(c,a+(b-a)*f);let best=Infinity;
  for(const g of [f,1-f]){const u=F.nearestParam(r.curve,q,ra+(rb-ra)*g);best=Math.min(best,G.dist(q,G.curvePoint(r.curve,u)));}
  if(best>worst){worst=best;at=f;}}
console.log('independent 20001-point max distance',worst.toExponential(3),'at fraction',at);
