// sensitivity control: how far does the exact spine move if g2 is wrong by a known 1e-12 m (blend 9821)?
const NB=require('./nurbs'),EX=require('./exact');
const {M}=require('./load')('/home/user/conv-dev');const F=require('/home/user/conv-dev/src/brep/fit');
const seen=new Set();let b;const w2=o=>{if(!o||typeof o!=='object'||seen.has(o)||b)return;seen.add(o);if(o.type==='blend'&&o.node===9821){b=o;return;}for(const x in o){if(x==='ctrl'||x==='knots'||x==='chart')continue;w2(o[x]);}};
for(const f of M.faces.values())w2(f);for(const e of M.edges.values())w2(e);
const c=F.spineOf(b,1e-8).curve,nested=S=>F.spineOf(S,1e-10).curve;
const [S1,S2]=b.spine.surfaces,g1=EX.mkG(S1,nested),g2=EX.mkG(S2,nested);
for(const eps of [1e-12,1e-11]){const g2p=X=>g2(X)+eps;
 for(const t of [0.5,0.9,0.99,0.999,0.99999,1]){const X=NB.curve(c,t),T=EX.sub(NB.curve(c,Math.min(1,t+1e-6)),NB.curve(c,t-1e-6));
  const a=EX.trueDist(g1,g2,X,T),p=EX.trueDist(g1,g2p,X,T),mv=NB.dist(a.Y,p.Y);
  console.log(`g2 +${eps} : t=${t} exact point moves ${mv.toExponential(2)} m (dist to exact ${a.d.toExponential(2)} -> ${p.d.toExponential(2)})`);}}
