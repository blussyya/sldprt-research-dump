// How far outside the display bbox are the loop vertices of the native faces that fail containment? (box part)
const fs=require('fs');
const src=fs.readFileSync(__dirname+'/dupjoin.js','utf8').replace(/console\.log\(JSON\.stringify\(res,null,1\)\);/,'');
eval(src+`
const over=[];for(const [id,ds] of D){if(ds.length<2)continue;const ns=(N.get(id)||[]).filter(n=>n.vs.length);if(!ns.length)continue;for(const d of ds){if(ns.some(n=>inside(d,n,1)))continue;
 let best=Infinity;for(const n of ns){let m=0;for(const v of n.vs)for(let k=0;k<3;k++)m=Math.max(m,d.mn[k]-v[k],v[k]-d.mx[k]);best=Math.min(best,m);}over.push(best);}}
console.log("misses",over.length,"smallest overshoot per miss (m):",over.map(x=>x.toExponential(2)).join(" "));
let anyN=0;for(const [id,ds] of D){if(ds.length<2)continue;const ns=(N.get(id)||[]).filter(n=>n.vs.length);if(!ns.length)continue;for(const d of ds){if(ns.some(n=>inside(d,n,1)))continue;const hit=nat.filter(n=>n.sid!==id&&n.vs.length&&inside(d,n,1)).length;console.log("missed id",id,"other-id native faces fully inside its bbox:",hit);}}`);
// extension: does any native face of ANY id (same part) have all loop vertices inside the display bbox of each missed face?
