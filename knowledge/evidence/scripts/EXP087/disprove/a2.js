const fs=require('fs');
const R='/home/user/solidworks-converters', S=require(R+'/src'), N=require(R+'/src/brep/native'),
F=require(R+'/src/brep/fit'), G=require(R+'/src/geom/eval');
const file=fs.readdirSync('/home/user/sldprt-research-dump/test files online').map(d=>'/home/user/sldprt-research-dump/test files online/'+d+'/82981f2a_head_back.sldprt').find(fs.existsSync);
const M=N.build(S.readBrep(file).parsed);
const f=M.faces.find(x=>x.id===2478)||M.faces[2478];
const b=f.surface, c=b.spine.type==='trimmed'?b.spine.basis:b.spine;
const [S1,S2]=c.surfaces, A=c.start.p,B=c.end.p;
console.log('S1 off d',S1.d,'basis',S1.basis.type,S1.basis.sense,'S2',S2.type, 'blend supports', b.surfaces.map(s=>s.type+(s.d!==undefined?' d='+s.d:'')));
let scale=0;for(let i=1;i<c.chart.length;i++)scale+=G.dist(c.chart[i],c.chart[i-1]);
const cd=G.sub(c.chart[1],c.chart[0]);
const poly=F.march? null:null;
// replicate spineOf pieces
const fit=F; 
const t0=Date.now();
const sp=F.spineOf(b,1e-8); console.log('spine',(Date.now()-t0)/1e3,'s err',sp.error, 'len pts', sp.curve.ctrl.length);
const curve=sp.curve; const [a0,a1]=G.curveRange(curve);
// dense sample of curve; arc length
let L=0,pp=null,arr=[];
for(let i=0;i<=4000;i++){const t=a0+(a1-a0)*i/4000;const p=G.curvePoint(curve,t);if(pp)L+=G.dist(p,pp);pp=p;arr.push({t,L,p});}
console.log('len',L,'ends',G.dist(arr[0].p,A),G.dist(arr[4000].p,B),G.dist(arr[0].p,B));
// exact points via corrector at dense samples; residual vs fit
const out=[];
for(let i=0;i<=4000;i+=1){const s=arr[i];const j=Math.min(i+1,4000),k=Math.max(i-1,0);const T=G.unit(G.sub(arr[j].p,arr[k].p));
  for(const cache of [new Map()]){
   try{const X=F.corrector(S1,S2,s.p,T,cache);const u=F.nearestParam(curve,X,s.t);const e=G.dist(X,G.curvePoint(curve,u));out.push({i,L:s.L,e,X});}catch(e){out.push({i,L:s.L,e:-1});}}}
const bad=out.filter(o=>o.e>1e-7||o.e<0);
console.log('n bad',bad.length, 'of',out.length); console.log(bad.slice(0,15).map(o=>[o.i,(o.L*1e3).toFixed(2),o.e.toExponential(2)].join(' ')).join('\n'));
fs.writeFileSync('a2.json',JSON.stringify({L,bad:bad.map(o=>({i:o.i,L:o.L,e:o.e,X:o.X})),ends:[A,B]}));
