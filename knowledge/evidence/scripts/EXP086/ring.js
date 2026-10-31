const R=process.env.CONV||require('path').join(__dirname,'../../../../../solidworks-converters');
const S=require(R+'/src'),N=require(R+'/src/brep/native');
const M=N.build(S.readBrep(process.argv[2]).parsed);const e=M.edges.get(21786);let c=e.curve;if(c.type==='trimmed')c=c.basis;
const ch=c.chart,d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
console.log('n',ch.length,'closed gap',d(ch[0],ch[ch.length-1]));let L=0;for(let i=1;i<ch.length;i++)L+=d(ch[i],ch[i-1]);console.log('len',L,'steps',ch.slice(1).map((p,i)=>(d(p,ch[i])*1e3).toFixed(3)).join(' '));
console.log(c.surfaces.map(s=>JSON.stringify(s,(k,v)=>k==='chart'?undefined:v).slice(0,300)).join('\n'));
const u=(a,b)=>{const v=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],l=Math.hypot(...v);return v.map(x=>x/l)};
for(let i=1;i<ch.length-1;i++){const a=u(ch[i-1],ch[i]),b=u(ch[i],ch[i+1]);console.log(i,(Math.acos(Math.min(1,a[0]*b[0]+a[1]*b[1]+a[2]*b[2]))*180/Math.PI).toFixed(1),ch[i].map(x=>(x*1e3).toFixed(4)).join(','))}
