// Every Parasolid section in every stream: kind, size, parse result, and planes parallel to STEP 173.
const P=require('/home/user/conv-inspector/src/parasolid/partition.js'),X=require('/home/user/conv-inspector/src/parasolid/xt.js');
const fs=require('fs');const N=[0,-0.0872,-0.9962],O=[-25.2,51.296,-70.238];
const raw=fs.readFileSync(process.argv[2]),all=P.streams(raw);
for(const [k,b] of Object.entries(all)){
  const G=Buffer.from(P.GUID),g=Buffer.from(b).indexOf(G);
  if(g<4)continue;const w=P.sections(b,g-4);
  w.out.forEach((s,si)=>{let q;try{q=X.parse(s.body,true,{});}catch(e){q={error:e.message}}
    const pl=[];if(q&&q.nodes)for(const n of q.nodes){if(n.name!=='PLANE')continue;const v=n.values,nn=v.normal,pt=v.pvec;if(!nn||!pt)continue;
      const d=nn[0]*N[0]+nn[1]*N[1]+nn[2]*N[2];if(Math.abs(Math.abs(d)-1)>1e-3)continue;
      const off=(pt[0]*1000-O[0])*N[0]+(pt[1]*1000-O[1])*N[1]+(pt[2]*1000-O[2])*N[2];if(Math.abs(off)<1)pl.push(n.index+':'+off.toFixed(4));}
    console.log(k,'#'+si,s.kind,s.body.length,'B',q.error?'parse error: '+String(q.error).slice(0,60):'nodes '+q.nodes.length+' faces '+q.nodes.filter(n=>n.name==='FACE').length,pl.length?'planes '+pl.join(' '):'');});
  if(w.error)console.log(k,'chain:',w.error);
}
