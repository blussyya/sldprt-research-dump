const L=require('./lib'),G=L.G;
const bad=require('./bad8.json').filter(b=>b.d<1e-3);
const b=bad.find(z=>Math.abs(z.x+0.04697)<1e-5)||bad[3];
const X=b.X, bas=L.off.basis;
const show=(t,r)=>console.log(t,r&&[r.u.toFixed(4),r.v.toFixed(4)]);
show('offset inverse, no near',G.surfaceInverse(L.off,X));
show('offset inverse, near main',G.surfaceInverse(L.off,X,{u:-13.21,v:76.96}));
show('offset inverse, near edge',G.surfaceInverse(L.off,X,{u:-12.5,v:47.559}));
show('basis inverse (clamped) no near',G.surfaceInverse(bas,X));
// distance profile: foot-distance of X to offset along v at u=-13.2 and at u=-12.5
const sub=(a,c)=>[a[0]-c[0],a[1]-c[1],a[2]-c[2]],nm=a=>Math.hypot(...a);
for(const v of [47.5,47.559,50,55,60,65,70,75,76.9,80]){const e=G.surfaceEval(L.off,-13.2,v);const e2=G.surfaceEval(L.off,-12.5,v);console.log('v',v,'|X-off(-13.2,v)|',nm(sub(X,e.p)).toFixed(5),' |X-off(-12.5,v)|',nm(sub(X,e2.p)).toFixed(5));}
