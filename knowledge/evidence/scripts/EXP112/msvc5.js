// EXP-112: step all key states back together and look for a step count where they bunch up
// (smallest circular span mod 2^24), which is what a seed from a small range would look like.
const fs=require('fs');const states=JSON.parse(fs.readFileSync(__dirname+'/states.json'));
const M=1<<24,A=214013,C=2531011;let Ainv=1;for(let i=0;i<24;i++)Ainv=Math.imul(Ainv,2-Math.imul(A,Ainv))&(M-1);const back=s=>Math.imul((s-C)&(M-1),Ainv)&(M-1);
let cur=Object.values(states).filter(a=>a.length===1).map(a=>a[0]);const best=[];
for(let j=0;j<=300000;j++){const s=[...cur].sort((a,b)=>a-b);let gap=s[0]+M-s[s.length-1];for(let i=1;i<s.length;i++)gap=Math.max(gap,s[i]-s[i-1]);const span=M-gap;
  if(best.length<5||span<best[best.length-1][1]){best.push([j,span]);best.sort((a,b)=>a[1]-b[1]);best.length=Math.min(best.length,5);}
  cur=cur.map(back);}
console.log('keys',cur.length,'smallest spans (steps back, span of 2^24):',JSON.stringify(best),'random expectation about',Math.round(M*(1-Math.log(cur.length)/cur.length)));
