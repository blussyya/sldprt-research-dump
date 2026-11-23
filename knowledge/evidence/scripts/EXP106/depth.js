// Synthetic chain: display face i sits at x=i+0.6 (prefers plane i+1), last face N-1 at x=N-0.9
// (prefers its own plane N-1, which greedy gave to face N-2). Kuhn's augmenting path then runs
// through all N faces. Checks whether meshResidual (HEAD, live file) survives, and time vs N.
const S=require('./variants/select_HEAD.js');
function run(N){
  const planes=[];for(let k=0;k<=N;k++)planes.push({surface:{type:'plane',p:[k,0,0],n:[1,0,0],x:[0,1,0]}});
  const faces=[];
  for(let i=0;i<N;i++){const x=i===N-1?N-0.9:i+0.6;faces.push({vertices:[x,0,0,x,1,0,x,0,1],normals:[1,0,0,1,0,0,1,0,0]});}
  const t0=Date.now();let res,err=null;
  try{res=S.meshResidual({faces},{faces:planes});}catch(e){err=e.constructor.name+': '+e.message;}
  return {N,ms:Date.now()-t0,res,err};
}
for(const N of [50,500,2000,5000,10000]){console.log(JSON.stringify(run(N)));}
