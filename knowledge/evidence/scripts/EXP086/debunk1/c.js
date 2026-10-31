const {out}=JSON.parse(require('fs').readFileSync('out.json'));
const rows=out.filter(r=>!r.err);
console.log(out.filter(r=>r.err));
const sk=rows.filter(r=>r.skip);const g={};for(const r of sk){const k=r.basisType+' '+r.skip;g[k]=(g[k]||0)+1;}console.log(g);
console.log(sk.slice(0,3));
console.log('nodata',rows.filter(r=>!r.skip&&r.mean===undefined).slice(0,4));
// consistency & oor
let incons=0,oor=0,tot=0;for(const r of rows.filter(r=>r.mean!==undefined)){tot++;const tol=1e-4*Math.abs(r.d)+1e-6;if(Math.abs(Math.abs(r.sMin)-Math.abs(r.d))>tol*5||Math.abs(Math.abs(r.sMax)-Math.abs(r.d))>tol*5||Math.sign(r.sMin)!==Math.sign(r.sMax)){incons++; if(incons<8)console.log('INC',r.f,r.off,r.d,r.sMin,r.sMax,r.oor,r.n);} if(r.oor)oor++;}
console.log({tot,incons,oor});
console.log('files with offsets',[...new Set(rows.map(r=>r.f))].length);
