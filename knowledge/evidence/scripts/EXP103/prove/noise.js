// noise floor of my signed-distance functions near the runout end of blend 9821's spine
const NB=require('./nurbs'),EX=require('./exact');
const {M}=require('./load')('/home/user/conv-dev');const F=require('/home/user/conv-dev/src/brep/fit');
const seen=new Set();let b;const w2=o=>{if(!o||typeof o!=='object'||seen.has(o)||b)return;seen.add(o);if(o.type==='blend'&&o.node===9821){b=o;return;}for(const x in o){if(x==='ctrl'||x==='knots'||x==='chart')continue;w2(o[x]);}};
for(const f of M.faces.values())w2(f);for(const e of M.edges.values())w2(e);
const c=F.spineOf(b,1e-8).curve,nested=S=>F.spineOf(S,1e-10).curve;
const [S1,S2]=b.spine.surfaces,g1=EX.mkG(S1,nested),g2=EX.mkG(S2,nested);
for(const t of [0.5,0.999,1]){const X=NB.curve(c,t);const dirs=[[1,0,0],[0,1,0],[0,0,1]];
  for(const [nm,g] of [['g1',g1],['g2',g2]]){let worst=0;
    for(const d of dirs)for(const h of [1e-9,1e-8,1e-7]){const a=g(EX.add(X,EX.mul(d,h))),m=g(X),z=g(EX.sub(X,EX.mul(d,h)));worst=Math.max(worst,Math.abs(a-2*m+z)/1);}
    console.log('t',t,nm,'max |2nd difference| over h in 1e-9..1e-7:',worst.toExponential(2));}}
// repeated evaluation determinism / seed dependence
const X=NB.curve(c,1);const v=[];for(let i=0;i<4;i++){v.push(g2(X));g1(EX.add(X,[1e-3,0,0]));}console.log('g2 repeat',v.map(x=>x.toExponential(3)).join(' '));
