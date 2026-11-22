const NB=require('./nurbs'),EX=require('./exact');
const {M}=require('./load')('/home/user/conv-dev');const F=require('/home/user/conv-dev/src/brep/fit');
const seen=new Set();let b;(function w(o){if(!o||typeof o!=='object'||seen.has(o)||b)return;seen.add(o);if(o.type==='blend'&&o.node===9821){b=o;return;}for(const x in o){if(x==='ctrl'||x==='knots'||x==='chart')continue;w(o[x]);}});
const w2=o=>{if(!o||typeof o!=='object'||seen.has(o)||b)return;seen.add(o);if(o.type==='blend'&&o.node===9821){b=o;return;}for(const x in o){if(x==='ctrl'||x==='knots'||x==='chart')continue;w2(o[x]);}};
for(const f of M.faces.values())w2(f);for(const e of M.edges.values())w2(e);
const r=F.spineOf(b,1e-8),c=r.curve;const nested=S=>F.spineOf(S,1e-10).curve;
const [S1,S2]=b.spine.surfaces,g1=EX.mkG(S1,nested),g2=EX.mkG(S2,nested);
const kn=c.knots,n=c.ctrl.length;console.log('knots tail',kn.slice(n-3,n+4),'knots head',kn.slice(0,8));
console.log('start',b.spine.start.p,'end',b.spine.end.p,'curve ends',NB.curve(c,kn[3]),NB.curve(c,kn[n]));
for(const t of [0.1,0.5,0.9,0.99,0.999,0.9999,0.99999,1.0]){const X=NB.curve(c,t),T=EX.sub(NB.curve(c,t+1e-7>1?1:t+1e-7),NB.curve(c,t-1e-7));
 const q=EX.trueDist(g1,g2,X,T);console.log(t,q.d.toExponential(2),'g1',g1(X).toExponential(2),'g2',g2(X).toExponential(2));}
