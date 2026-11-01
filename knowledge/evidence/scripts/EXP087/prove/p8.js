const L=require('./lib'),G=L.G,F=L.F;
let cur=L.solve(0.02,-20.3593,29.8235);const main=[];
for(let x=0.02;x>-0.0481;x-=0.00005){cur=L.solve(x,cur.u,cur.v);main.push({x,...cur});}
const S1=L.off,S2=L.pl,at=x=>main[Math.min(main.length-1,Math.max(0,Math.round((0.02-x)/0.00005)))];
function tang(i){const a=main[Math.max(0,i-1)].p,b=main[Math.min(main.length-1,i+1)].p;const d=[0,1,2].map(k=>b[k]-a[k]);const n=Math.hypot(...d);return d.map(v=>v/n);}
let seed=777;const rnd=()=>{seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296;};
function dev(X){const m=at(X[0]);const r=L.solve(X[0],m.u,m.v);return r?Math.hypot(r.p[1]-X[1],r.p[2]-X[2]):NaN;}
const bad=[];let tot=0;
const i0=Math.round((0.02+0.0481)/0.00005), iS=Math.round((0.02+0.041)/0.00005);
for(let i=iS;i<=Math.min(i0,main.length-1);i+=2){
  const m=main[i],T=tang(i);
  for(let k=0;k<4;k++){
    const g=[0,1,2].map(c=>m.p[c]+(rnd()-.5)*2*6e-5+T[c]*(rnd()-.5)*2e-4);
    const cache=new Map(); if(k==2)cache.set(S1,{u:m.u,v:m.v}); if(k==3)cache.set(S1,{u:m.u,v:m.v+0.5});
    let X;try{X=F.corrector(S1,S2,g,T,cache);}catch(e){continue;}
    tot++;const d=dev(X);
    if(!(d<2e-7))bad.push({x:X[0],d,X,foot:cache.get(S1),mode:k,gx:g[0]});
  }
}
console.log('calls',tot,'bad',bad.length);
for(const b of bad)console.log(b.x.toFixed(5),(b.d*1e6).toFixed(1)+'um','mode',b.mode,b.foot&&[b.foot.u.toFixed(3),b.foot.v.toFixed(3)],'main',at(b.x).u.toFixed(2),at(b.x).v.toFixed(2));
require('fs').writeFileSync('bad8.json',JSON.stringify(bad));
