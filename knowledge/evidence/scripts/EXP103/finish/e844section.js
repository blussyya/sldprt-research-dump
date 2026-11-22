// EXP-103 (finish): is edge 844's section chosen badly? reanchor scores a section by each vertex's
// distance to the nearest of 33 grid points on it. Score it instead by each vertex's distance to
// the section itself (grid, then halving search in v), pick u the same way, and compare.
const R=process.env.CONV||'/home/user/solidworks-converters',G=require(R+'/src/geom/eval');
const {c,p0,p1}=JSON.parse(require('fs').readFileSync(__dirname+'/../e844-capture.json','utf8'));
const S=c.surface,dist=G.dist;
const toSection=(u,q)=>{const f=v=>G.surfaceEval(S,u,v).p;let bv=0,bd=Infinity;for(let i=0;i<=256;i++){const x=dist(f(i/256),q);if(x<bd){bd=x;bv=i/256;}}
  let h=1/256;for(let k=0;k<50;k++){for(const v of [bv-h,bv+h]){if(v<0||v>1)continue;const x=dist(f(v),q);if(x<bd){bd=x;bv=v;}}h/=2;}return {v:bv,d:bd};};
const min1=(g,lo,hi,n)=>{let bt=lo,bs=Infinity;for(let i=0;i<=n;i++){const t=lo+(hi-lo)*i/n,s=g(t);if(s<bs){bs=s;bt=t;}}
  let h=(hi-lo)/n;for(let k=0;k<50;k++){for(const t of [bt-h,bt+h]){if(t<lo||t>hi)continue;const s=g(t);if(s<bs){bs=s;bt=t;}}h/=2;}return bt;};
for(const [name,g] of [['sum of distances',u=>toSection(u,p0).d+toSection(u,p1).d],['larger distance',u=>Math.max(toSection(u,p0).d,toSection(u,p1).d)]]){
  const u=min1(g,0,1,64),a=toSection(u,p0),b=toSection(u,p1);
  console.log(name.padEnd(17),'u',u.toFixed(9),'| p0',a.d.toExponential(3),'m at v',a.v.toFixed(9),'| p1',b.d.toExponential(3),'m at v',b.v.toFixed(9));}
// each vertex on its own: the section nearest to it
for(const [n,q] of [['p0',p0],['p1',p1]]){const u=min1(x=>toSection(x,q).d,0,1,64),a=toSection(u,q);console.log('own section of',n,'u',u.toFixed(9),'distance',a.d.toExponential(3),'at v',a.v.toFixed(9));}
// the surface's own v=0 and v=1 boundary: are the vertices on it?
for(const [n,q] of [['p0',p0],['p1',p1]])for(const v of [0,1]){const f=u=>G.surfaceEval(S,u,v).p,u=min1(x=>dist(f(x),q),0,1,256);console.log(n,'to the v='+v+' boundary',dist(f(u),q).toExponential(3),'m at u',u.toFixed(9));}
