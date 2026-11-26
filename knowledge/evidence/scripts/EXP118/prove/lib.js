// Own minimal reader for display face records (independent of src/display.js except the
// container layer, which only hands over the DisplayLists bytes).
const fs=require('fs'),zlib=require('zlib');
const S=require('/home/user/solidworks-converters/src');
const ole=require('/home/user/solidworks-converters/src/container/ole');
const modern=require('/home/user/solidworks-converters/src/container/modern');
function dlBytes(path){
  const b=fs.readFileSync(path);
  const inR=x=>zlib.inflateRawSync(x,{maxOutputLength:128<<20}),inZ=x=>zlib.inflateSync(x,{maxOutputLength:128<<20});
  if(modern.isOLE2(b))return {legacy:true,dl:Buffer.from(ole.displayLists(new Uint8Array(b),inZ).bytes)};
  return {legacy:false,dl:Buffer.from(modern.findDisplayLists(new Uint8Array(b),inR,inZ))};
}
// read a typed array header [stride, kind, 2, count] at o
function hdr(dl,o){if(o+16>dl.length)return null;return [dl.readUInt32LE(o),dl.readUInt32LE(o+4),dl.readUInt32LE(o+8),dl.readUInt32LE(o+12)];}
function isArr(dl,o,stride,kind){const h=hdr(dl,o);return h&&h[0]===stride&&h[1]===kind&&h[2]===2&&o+16+stride*h[3]<=dl.length;}
// Read one face record starting at o: strip lengths, positions, normals, Block1, Block2, Block3.
function readFace(dl,o){
  const arrs=[];let at=o;
  const want=[[4,8],[12,100],[12,100],[4,8],[4,8],[1,8]];
  for(const [s,k] of want){if(!isArr(dl,at,s,k))return null;const n=dl.readUInt32LE(at+12);arrs.push({o:at,n,data:at+16});at+=16+s*n;}
  const [L,P,N,B1,B2,B3]=arrs;
  const strips=[];for(let i=0;i<L.n;i++)strips.push(dl.readUInt32LE(L.data+4*i));
  const V=P.n,pos=[],nor=[];
  for(let i=0;i<V;i++){pos.push([0,1,2].map(k=>dl.readFloatLE(P.data+12*i+4*k)));nor.push([0,1,2].map(k=>dl.readFloatLE(N.data+12*i+4*k)));}
  const b1=[];for(let i=0;i<B1.n;i++)b1.push(dl.readUInt32LE(B1.data+4*i));
  const b2=[];for(let i=0;i<B2.n;i++)b2.push(dl.readUInt32LE(B2.data+4*i));
  const b3=[];for(let i=0;i<B3.n;i++)b3.push(dl[B3.data+i]);
  // own strip walk: triangles and per-triangle-edge Block1 ids
  const tris=[],edges=[];let v=0,t=0,ok=strips.reduce((a,b)=>a+b,0)===V&&N.n===V&&b2.length===strips.length;
  strips.forEach((n,s)=>{
    const sec=b1.slice(t,t+b2[s]);t+=b2[s];
    const ctrl=sec[0];let k=1;
    const lab=(a,b)=>edges.push({a,b,id:sec[k++],strip:s});
    if(ctrl===0&&n===3){lab(v,v+2);lab(v,v+1);lab(v+1,v+2);tris.push([v,v+1,v+2]);v+=n;return;}
    lab(v,v+1);
    for(let i=2;i<n;i++){tris.push(i%2===0?[v+i-2,v+i-1,v+i]:[v+i-1,v+i-2,v+i]);lab(v+i-2,v+i);lab(v+i-1,v+i);}
    if(k!==sec.length)ok=false;
    v+=n;
  });
  return {offset:o,end:at,strips,pos,nor,b1,b2,b3,tris,edges,ok};
}
const key=p=>p[0]+','+p[1]+','+p[2];
// Mesh-boundary edges: triangle edges used once, vertices welded by exact float32 coordinates.
function meshEdges(face){
  const K=face.pos.map(key);
  const use=new Map();let degenerate=0;
  for(const tr of face.tris){const k=tr.map(i=>K[i]);if(k[0]===k[1]||k[1]===k[2]||k[0]===k[2]){degenerate++;continue;}
    for(let j=0;j<3;j++){const a=k[j],b=k[(j+1)%3],pk=a<b?a+'|'+b:b+'|'+a;if(!use.has(pk))use.set(pk,{a,b,n:0,verts:[tr[j],tr[(j+1)%3]]});use.get(pk).n++;}}
  // Block1 ids by welded pair (all annotations for that pair)
  const ids=new Map();
  for(const e of face.edges){const a=K[e.a],b=K[e.b];if(a===b)continue;const pk=a<b?a+'|'+b:b+'|'+a;if(!ids.has(pk))ids.set(pk,[]);ids.get(pk).push(e.id);}
  const boundary=[],over=[];
  for(const [pk,u] of use){if(u.n===1)boundary.push({pk,...u,ids:ids.get(pk)||[]});else if(u.n>2)over.push({pk,...u});}
  return {K,use,boundary,over,degenerate,ids};
}
function chains(segs){
  // segs: [{a,b}] keys. Returns connected components with vertex degrees.
  const adj=new Map();for(const s of segs){for(const [x,y] of [[s.a,s.b],[s.b,s.a]]){if(!adj.has(x))adj.set(x,[]);adj.get(x).push(y);}}
  const seen=new Set(),comps=[];
  for(const s of adj.keys())if(!seen.has(s)){const st=[s],c=[];seen.add(s);while(st.length){const x=st.pop();c.push(x);for(const y of adj.get(x))if(!seen.has(y)){seen.add(y);st.push(y);}}
    const deg=c.map(x=>adj.get(x).length);comps.push({vertices:c.length,edges:deg.reduce((a,b)=>a+b,0)/2,degrees:[...new Set(deg)].sort(),closed:deg.every(d=>d===2)});}
  return comps;
}
const P=k=>k.split(',').map(Number);
module.exports={dlBytes,hdr,isArr,readFace,meshEdges,chains,key,P,S};
