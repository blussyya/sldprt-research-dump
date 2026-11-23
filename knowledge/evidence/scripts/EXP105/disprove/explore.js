const L=require('./lib');const f=process.argv[2];
const {d,M,j}=L.load(f);
console.log(f,'faces',d.faces.length,'native',M.faces.length,'hows',JSON.stringify(j.reduce((a,x)=>(a[x.how]=(a[x.how]||0)+1,a),{})));
d.faces.forEach((df,i)=>{const nf=j[i].face;if(!nf)return;const s=nf.surface;if(s.type!=='cylinder'&&s.type!=='cone'&&s.type!=='plane')return;
 let mx=0,n=[0,0,0,0,0,0];const th=[1e-9,1e-8,1e-7,1e-6,1e-5];
 for(let k=0;k<df.vertexCount;k++){const r=Math.abs(L.dSurf(s,L.V(df,k)));mx=Math.max(mx,r);th.forEach((t,q)=>{if(r>t)n[q]++;});}
 console.log(i,s.type,'rawId',df.metadata.rawId,'nv',df.vertexCount,'max',mx.toExponential(2),'>1e-9,1e-8,1e-7,1e-6,1e-5:',n.slice(0,5).join(','),'r',s.r,'coordmax',Math.max(...df.bounds.max.map(Math.abs)).toFixed(4));});
