const {F,G,S1,S2,A,B,c,fs}=require('./common');
const poly=JSON.parse(fs.readFileSync('poly.json'));
let t=Date.now();const tick=m=>{console.log(m,Date.now()-t,'ms');t=Date.now();};
const seeds=[];let run=new Map();
for(let i=0;i<poly.length;i++){for(const S of [S1,S2]){const r=G.surfaceInverse(S,poly[i],run.get(S));run.set(S,{u:r.u,v:r.v});}seeds.push(new Map(run));tick('seed'+i);}
const T=G.unit(G.sub(poly[1],poly[0]));
for(let k=1;k<4;k++){const g=G.add(poly[0],G.mul(G.sub(poly[1],poly[0]),k/4));F.corrector(S1,S2,g,T,new Map(seeds[0]));tick('corr'+k);}
