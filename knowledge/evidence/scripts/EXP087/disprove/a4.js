const {F,G,S1,S2,A,B,c,fs}=require('./common');
const poly=JSON.parse(fs.readFileSync('poly.json'));
const L=[0];for(let i=1;i<poly.length;i++)L.push(L[i-1]+G.dist(poly[i],poly[i-1]));
const seeds=[];let run=new Map();
for(let i=0;i<poly.length;i++){for(const S of [S1,S2]){const r=G.surfaceInverse(S,poly[i],run.get(S));run.set(S,{u:r.u,v:r.v});}seeds.push(new Map(run));}
const pts=[];const N=40;
for(let i=1;i<poly.length;i++){const a=poly[i-1],b=poly[i];const T=G.unit(G.sub(b,a));
 for(let k=1;k<N;k++){const g=G.add(a,G.mul(G.sub(b,a),k/N));
  const X=F.corrector(S1,S2,g,T,new Map(seeds[i-1]));pts.push({s:L[i-1]+(L[i]-L[i-1])*k/N,X,g,i});}}
const dev=[];for(let j=3;j<pts.length-3;j++){const q=[-3,-2,-1,1,2,3].map(o=>pts[j+o]);
  const s0=pts[j].s;let P=[0,0,0];q.forEach((a,ia)=>{let w=1;q.forEach((b,ib)=>{if(ia!==ib)w*=(s0-b.s)/(a.s-b.s);});P=G.add(P,G.mul(a.X,w));});
  dev.push([pts[j].s,G.dist(P,pts[j].X)]);}
const big=dev.filter(d=>d[1]>5e-6);console.log('n',pts.length,'outliers',big.length,big.slice(0,30).map(d=>[(d[0]*1e3).toFixed(2),d[1].toExponential(1)].join(':')).join(' '));
fs.writeFileSync('pts4.json',JSON.stringify(pts.map(p=>({s:p.s,X:p.X,g:p.g,i:p.i}))));
