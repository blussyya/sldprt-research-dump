// summarize an _off.jsonl: chord points vs off-chord; dCurve vs |res|; dOtherSurf
const rs=require('fs').readFileSync(process.argv[2],'utf8').split('\n').filter(Boolean).map(JSON.parse);
const q=a=>{a=a.filter(x=>x!==null&&x!==undefined&&!isNaN(x)).sort((x,y)=>x-y);return a.length?a.length+' n; '+[a[0],a[a.length>>1],a[a.length-1]].map(x=>x.toExponential(1)).join(' / '):'-';};
const TOL=+process.argv[3]||3e-8;
const B=rs.filter(r=>r.boundary&&r.chord!==null),C=B.filter(r=>r.chord<=TOL),O=B.filter(r=>r.chord>TOL);
console.log('off>1e-7',rs.length,'noBoundary',rs.filter(r=>!r.boundary).length,'chord',C.length,'offchord',O.length);
const grp=(A,key)=>{const g={};for(const r of A){const k=key(r);(g[k]=g[k]||[]).push(r)}return g};
const ctype=r=>r.ctypes.length?r.ctypes.map(t=>t.replace('trimmed:','t:').replace('(tol)','~')).join('|'):'nocand';
console.log('CHORD pts: |res| ',q(C.map(r=>Math.abs(r.res))));
console.log(' dCurve (annotated edges of face)',q(C.map(r=>r.dCurve)),' ratio dCurve/|res|',q(C.map(r=>r.dCurve/Math.abs(r.res))));
console.log(' dCurve<1e-8 count',C.filter(r=>r.dCurve!==null&&r.dCurve<1e-8).length,' dCurve null',C.filter(r=>r.dCurve===null).length);
console.log(' dOtherSurf',q(C.map(r=>r.dOtherSurf)),' <1e-8:',C.filter(r=>r.dOtherSurf!==null&&r.dOtherSurf<1e-8).length,'nOtherSurf analytic 0:',C.filter(r=>!r.nOtherSurfAnalytic).length);
console.log('OFFCHORD pts: |res|',q(O.map(r=>Math.abs(r.res))),' chord',q(O.map(r=>r.chord)));
console.log(' dCurve',q(O.map(r=>r.dCurve)),' dCurveAnyCand',q(O.map(r=>r.dCurveAnyCand)),' dAnyLoopCurve',q(O.map(r=>r.dAnyLoopCurve)),' dOtherSurf',q(O.map(r=>r.dOtherSurf)));
console.log(' by edge types',Object.entries(grp(O,ctype)).map(([k,v])=>k+':'+v.length).join('  '));
// chord points on circle/ellipse-only edges: distance to curve
const circ=C.filter(r=>r.ctypes.length&&r.ctypes.every(t=>/circle|ellipse/.test(t)));
console.log('CHORD pts whose edges are all circle/ellipse:',circ.length,' dCurve',q(circ.map(r=>r.dCurve)),' min dCurve/|res|',q(circ.map(r=>r.dCurve/Math.abs(r.res))));
console.log(' of those dCurve<1e-8:',circ.filter(r=>r.dCurve<1e-8).length,' dCurve<1e-7:',circ.filter(r=>r.dCurve<1e-7).length);
// chord points near the curve anyway
const near=C.filter(r=>r.dCurve!==null&&r.dCurve<1e-8);console.log('chord points within 1e-8 of annotated edge curve:',near.length,Object.entries(grp(near,ctype)).map(([k,v])=>k+':'+v.length).join(' '));
console.log('chord pts, by chordT range: t<0 or >1 (outside segment):',C.filter(r=>r.chordT<0||r.chordT>1).length);
