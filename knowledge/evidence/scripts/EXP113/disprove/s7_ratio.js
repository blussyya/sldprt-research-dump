// chord points: how far from "as far from edge curve as from surface" (ratio dCurve/|res|); list outliers
const rs=require('fs').readFileSync(process.argv[2],'utf8').split('\n').filter(Boolean).map(JSON.parse).filter(r=>r.boundary&&r.chord<=(+process.argv[3]||1e-7)&&r.dCurve!==null);
const bad=rs.filter(r=>r.dCurve/Math.abs(r.res)<0.95||r.dCurve/Math.abs(r.res)>1.05);
console.log('chord pts with curve',rs.length,'ratio outside 0.95..1.05:',bad.length);
const g={};for(const r of bad){const k=r.stype+' '+r.ctypes.map(t=>t.replace('trimmed:','t:').replace('(tol)','~')).join('|');g[k]=(g[k]||0)+1}console.log(g);
for(const r of bad.slice(0,6))console.log(' face',r.face,r.how,r.stype,'k',r.k,'res',r.res.toExponential(2),'dCurve',r.dCurve.toExponential(2),'dFin',r.dFin&&r.dFin.toExponential(2),'dAnyLoop',r.dAnyLoopCurve&&r.dAnyLoopCurve.toExponential(2),'ids',r.ids.join(','),r.ctypes.join('|'));
