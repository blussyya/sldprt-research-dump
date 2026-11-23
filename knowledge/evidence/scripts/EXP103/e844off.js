// EXP-103: refit the captured edge-844 SP_CURVE alone. usage: CONV=<repo> node e844off.js
const R=process.env.CONV||'/home/user/solidworks-converters',F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval');
const {c,p0,p1}=JSON.parse(require('fs').readFileSync(__dirname+'/e844-capture.json','utf8'));
const [a,b]=G.curveRange(c);
console.log('curve end 0 to p0',G.dist(G.curvePoint(c,a),p0).toExponential(2),'to p1',G.dist(G.curvePoint(c,a),p1).toExponential(2),' end 1 to p0',G.dist(G.curvePoint(c,b),p0).toExponential(2),'to p1',G.dist(G.curvePoint(c,b),p1).toExponential(2));
const e={id:844,sameSense:true};
const r=F.edgeCurve(e,c,p0,p1,{tolerance:1e-8});console.log('edgeCurve error',r.error.toExponential(3),'ctrl',r.curve.ctrl.length);
const N=Math.max(8,c.c2.ctrl.length*2);
for(const [name,fn] of [['reanchor',()=>F.reanchor(c.surface,c,p0,p1,N,1e-8)]]){try{const x=fn();console.log(name,'error',x.error.toExponential(3),'ctrl',x.curve.ctrl.length,'samples',x.samples);}catch(err){console.log(name,'threw',err.message);}}
// how far are the vertices from the fitted surface (nearest point by projection)?
{const S=c.surface;for(const [n,p] of [['p0',p0],['p1',p1]]){const r=G.surfaceDistance?G.surfaceDistance(S,p):null;const f=G.bsplineProject(S,p);console.log(n,'distance to fitted blend surface',f.d.toExponential(3));}}
// the fitted edge curve against the surface it lies on (independent of fitPoints' own fn): max distance over 2001 points
{const S=c.surface,[ra,rb]=G.curveRange(r.curve);let w=0,at=0;for(let i=0;i<=2000;i++){const q=G.curvePoint(r.curve,ra+(rb-ra)*i/2000),d=G.bsplineProject(S,q).d;if(d>w){w=d;at=i/2000;}}
 console.log('edge curve to its blend surface: max',w.toExponential(3),'at fraction',at);}
