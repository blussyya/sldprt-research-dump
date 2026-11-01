const L=require('./lib'),G=L.G,F=L.F;
let cur=L.solve(0.02,-20.3593,29.8235);const main=[];
for(let x=0.02;x>-0.0481;x-=0.00005){cur=L.solve(x,cur.u,cur.v);main.push({x,...cur});}
const S1=L.off,S2=L.pl;
const at=x=>main[Math.min(main.length-1,Math.max(0,Math.round((0.02-x)/0.00005)))];
function tang(i){const a=main[Math.max(0,i-1)].p,b=main[Math.min(main.length-1,i+1)].p;const d=[0,1,2].map(k=>b[k]-a[k]);const n=Math.hypot(...d);return d.map(v=>v/n);}
let seed=12345;const rnd=()=>{seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296;};
// deviation of X from main curve: solve slice x=X[0] from main (u,v) of nearest x
function dev(X){const m=at(X[0]);const r=L.solve(X[0],m.u,m.v);return r?Math.hypot(r.p[1]-X[1],r.p[2]-X[2]):NaN;}
const bad=[];let tot=0,fail=0;
for(let i=0;i<main.length;i+=(+process.argv[2]||4)){ if(main[i].x>(+process.argv[3]||-0.036)&&main[i].x<0.0125)continue;
  const m=main[i],T=tang(i);process.stderr.write(i+' ');
  for(let k=0;k<3;k++){
    const g=[0,1,2].map(c=>m.p[c]+(rnd()-.5)*2*4e-5+T[c]*(rnd()-.5)*1e-4);
    // cache modes: empty ; seeded at far (u,v)
    const cache=new Map();
    if(k==2)cache.set(S1,{u:m.u+(rnd()-.5)*50,v:m.v+(rnd()-.5)*50});
    let X;try{X=F.corrector(S1,S2,g,T,cache);}catch(e){fail++;continue;}
    tot++;const d=dev(X);
    if(!(d<1e-9))bad.push({x:X[0],d,X,cu:cache.get(S1),mode:k,g});
  }
}
console.log('corrector calls',tot,'fails',fail,'bad',bad.length);
const bx=bad.map(b=>b.x);console.log('bad x range',Math.min(...bx),Math.max(...bx));
for(const b of bad.slice(0,15))console.log(b.x.toFixed(5),(b.d*1e6).toFixed(1)+'um','mode',b.mode,b.cu&&[b.cu.u.toFixed(2),b.cu.v.toFixed(2)]);
require('fs').writeFileSync('bad7.json',JSON.stringify(bad));
