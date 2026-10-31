const {G,F,c,b}=require('./load.js');
const Fo=require('./fit_old.js');
const fs=require('fs');
let t=Date.now();
const nw=F.spineOf(b,1e-8);console.error('new',Date.now()-t,'ms err',nw.error,'ctrl',nw.curve.ctrl.length);
t=Date.now();
const od=Fo.spineOf(b,1e-8);console.error('old',Date.now()-t,'ms err',od.error,'ctrl',od.curve.ctrl.length);
fs.writeFileSync('fits.json',JSON.stringify({nw,od}));
for(const [n,r] of [['new',nw],['old',od]]){const k=r.curve.knots;console.log(n,'knots tail',k.slice(-8).map(x=>x.toExponential(6)).join(' '));
 console.log(n,'end pt',G.curvePoint(r.curve,1),'dist to T',G.dist(G.curvePoint(r.curve,1),c.end.p),'dist to L',G.dist(G.curvePoint(r.curve,0),c.start.p));}
