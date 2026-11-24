const {S,files}=require('./lib');const fs=require('fs'),cr=require('crypto');
const h=new Map();for(const p of files()){const k=cr.createHash('md5').update(fs.readFileSync(p)).digest('hex');if(!h.has(k))h.set(k,[]);h.get(k).push(p.replace(/.*test files /,''));}
console.log('files',files().length,'distinct',h.size);for(const l of h.values())if(l.length>1)console.log(l.join(' = '));
// converter's own cycles vs mine on the 159
const {fanWalk}=require('./fan');const {simpleLoops}=require('./simpleloops');
function canon(seq){let s=seq.filter((x,i)=>i===0||x!==seq[i-1]);while(s.length>1&&s[0]===s[s.length-1])s.pop();let best=null;for(const q of [s,[...s].reverse()])for(let k=0;k<q.length;k++){const c=q.slice(k).concat(q.slice(0,k)).join(',');if(best===null||c<best)best=c;}return best;}
let n=0,eq=0,err=0,diff=[];
for(const p of files()){if(/chainwheel/.test(p))continue;const d=S.parse(p);d.faces.forEach((f,i)=>{if(f.noEdgeTable||simpleLoops(f))return;n++;
  if(!f.boundaryCycles){err++;return;}
  const mine=fanWalk(f).loops.map(l=>canon(l.ids)).sort().join('#'),theirs=f.boundaryCycles.map(c=>canon(c.edgeIds)).sort().join('#');
  if(mine===theirs)eq++;else diff.push([p,i]);});}
console.log({nonSimpleNonChain:n,converterErrors:err,sameAsMine:eq,differ:diff.length});
