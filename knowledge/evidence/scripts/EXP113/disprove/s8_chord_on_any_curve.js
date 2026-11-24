// chord points (chord<=1e-7): is any of them within 1e-7 of ANY native edge curve (all edges of the part)? Control: on-curve boundary verts.
const L=require('./lib.js');const name=process.argv[2];
const {d,N}=L.load(L.PARTS[name]||name);
if(process.env.RESOLVE)L.setResolved(require('/home/user/solidworks-converters/src/brep/procedural.js').resolve(N));
const all=require('fs').readFileSync('/tmp/claude-0/'+name+'_off.jsonl','utf8').split('\n').filter(Boolean).map(JSON.parse).filter(r=>r.boundary&&r.chord<=1e-7);
const ctl=require('fs').readFileSync('/tmp/claude-0/'+name+'_off_ctl.jsonl','utf8').split('\n').filter(Boolean).map(JSON.parse).slice(0,300);
const edges=[...N.edges.values()];
const box=e=>{let c=e.curve;if(c.type==='trimmed')c=c.basis;if(c.type==='bspline'&&c.ctrl){const mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];for(const q of c.ctrl)for(let i=0;i<3;i++){mn[i]=Math.min(mn[i],q[i]);mx[i]=Math.max(mx[i],q[i]);}return [mn,mx];}return null;};
const boxes=new Map(edges.map(e=>[e,box(e)]));
function nearest(p){let best=[Infinity,null],skipped=0;for(const e of edges){const b=boxes.get(e);if(b&&p.some((x,i)=>x<b[0][i]-1e-3||x>b[1][i]+1e-3))continue;const x=L.curveDist(e,p);if(x===null){skipped++;continue;}if(x<best[0])best=[x,e];}return {d:best[0],e:best[1],skipped};}
function run(rows,label){const seen=new Set();let n=0,hit=[];for(const r of rows){const p=L.vtx(d.faces[r.fi],r.k),key=p.join(',');if(seen.has(key))continue;seen.add(key);n++;const x=nearest(p);if(x.d<1e-7)hit.push([r.face,r.k,x.d,x.e&&x.e.id,x.e&&x.e.curve.type,r.res]);}
  console.log(name,label,'unique pts',n,'within 1e-7 of some edge curve:',hit.length);for(const h of hit.slice(0,10))console.log('  face',h[0],'k',h[1],'dist',h[2].toExponential(1),'edge',h[3],h[4],'res',h[5].toExponential?h[5].toExponential(1):h[5]);}
run(all,'CHORD pts');run(ctl.map(r=>({...r})),'CONTROL on-surface boundary pts (must be ~all hits)');
