const {M}=require('./load')('/home/user/conv-dev');
const want=[9821,10371,9931,10129,10349];
const seen=new Set(),found={};
function walk(o,path){if(!o||typeof o!=='object'||seen.has(o))return;seen.add(o);
  if(o.type==='blend'&&want.includes(o.node)&&!found[o.node]){found[o.node]=o;}
  for(const k in o){if(k==='ctrl'||k==='knots')continue;walk(o[k]);}}
for(const f of M.faces.values())walk(f);
for(const e of M.edges.values())walk(e);
for(const w of want){const b=found[w];if(!b){console.log(w,'not found');continue;}
 console.log(w,b.blendType,b.range,b.spine.type,b.spine.surfaces&&b.spine.surfaces.map(s=>s.type+s.node),!!b.spine.start,!!b.spine.end,b.spine.chart&&b.spine.chart.length,b.surfaces.map(s=>s.type+s.node));}
const sh=(s,d=0)=>{const o={t:s.type,node:s.node};if(s.distance!==undefined)o.dist=s.distance;if(s.d!==undefined)o.d=s.d;if(s.basis&&d<3)o.basis=sh(s.basis,d+1);if(s.range)o.range=s.range;if(s.spine&&d<3){o.spine=s.spine.type;if(s.spine.surfaces)o.sps=s.spine.surfaces.map(x=>sh(x,d+1));}if(s.surfaces&&!s.spine)o.sup=s.surfaces.map(x=>sh(x,d+1));return o;};
for(const w of want)console.log(w,JSON.stringify(sh(found[w].spine.surfaces[0])),JSON.stringify(sh(found[w].spine.surfaces[1])));
console.log(Object.keys(found[9821].spine), found[9821].spine.chart.slice(0,2), found[9821].spine.start, found[9821].spine.end);
for(const id of [3436,3433,3435]){const s=[...seen].find(o=>o.type==='bspline'&&o.node===id&&o.ctrl&&o.ctrl[0]&&o.ctrl[0][0]&&Array.isArray(o.ctrl[0][0]));if(s)console.log(id,s.du,s.dv,s.ctrl.length,s.ctrl[0].length,!!s.weights,s.uClosed,s.vClosed,s.ku[0],s.ku.at(-1),s.kv[0],s.kv.at(-1));else console.log(id,'no');}
