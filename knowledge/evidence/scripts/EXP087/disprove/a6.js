const {F,G,S1,S2,c,fs}=require('./common');
const pts=JSON.parse(fs.readFileSync('pts4.json'));
const ref=pts.filter(p=>(p.s>0.0575&&p.s<0.0595)||(p.s>0.0622&&p.s<0.0642)).filter((p,i)=>i%3==0);
console.log('ref n',ref.length);
function interp(s0){let P=[0,0,0];ref.forEach((a,ia)=>{let w=1;ref.forEach((b,ib)=>{if(ia!==ib)w*=(s0-b.s)/(a.s-b.s);});P=G.add(P,G.mul(a.X,w));});return P;}
for(const p of pts.filter(p=>p.s>0.0595&&p.s<0.0622)){
  const P=interp(p.s);const a=S1.basis?0:0;
  console.log((p.s*1e3).toFixed(2),'seg',p.i,'dev',G.dist(P,p.X).toExponential(2),'g-X',G.dist(p.g,p.X).toExponential(2));}
