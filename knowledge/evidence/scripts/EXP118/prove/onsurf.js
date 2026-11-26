// Distance of every vertex of display faces 75 and 448 to the native cylinders 2516 and 12997
// (12997 is 2516 mirrored in x = 0), split by vertex role: on a labelled boundary edge, on the
// unlabelled chain, interior. Control: an ordinary cylinder display face's vertices.
const L=require('./lib'),G=require('./geo');
const native=require('/home/user/solidworks-converters/src/brep/native');
const F='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const {dl}=L.dlBytes(F);const conv=L.S.parse(F);const m=native.build(L.S.readBrep(F).parsed);
const faces=conv.faces.map(f=>L.readFace(dl,f.offset));const nf=id=>m.faces.find(f=>f.id===id);
function roles(f){const M=L.meshEdges(f),lab=new Set(),unl=new Set();for(const e of M.boundary){(e.ids.some(x=>x)?lab:unl).add(e.a);(e.ids.some(x=>x)?lab:unl).add(e.b);}return {lab,unl,K:M.K};}
for(const [fi,sid] of [[75,2516],[448,12997],[75,12997],[448,2516]]){const f=faces[fi],R=roles(f),s=nf(sid).surface;
  const st={labelled:[],unlabelled:[],interior:[]};const seen=new Set();
  f.pos.forEach((p,i)=>{const k=R.K[i];if(seen.has(k))return;seen.add(k);const d=G.distSurface(p,s);(R.lab.has(k)?st.labelled:R.unl.has(k)?st.unlabelled:st.interior).push(d);});
  const sum=a=>a.length?{n:a.length,max:Math.max(...a).toExponential(2),mean:(a.reduce((x,y)=>x+y,0)/a.length).toExponential(2)}:{n:0};
  console.log('display',fi,'vs native cylinder',sid,JSON.stringify({labelled:sum(st.labelled),unlabelled:sum(st.unlabelled),interior:sum(st.interior)}));}
// where do the unlabelled-chain vertices sit along the axis of 2516 compared to the two loops?
{const s=nf(2516).surface,f=faces[75],R=roles(f);const a=G.unit(s.a);const h=p=>G.dot(G.sub(p,s.p),a);
 const H=(set)=>{const v=[...set].map(k=>h(L.P(k)));return [Math.min(...v),Math.max(...v)].map(x=>+x.toFixed(7));};
 const e1165=m.edges.get(1165).curve,e1166=m.edges.get(1166).curve;
 console.log('axial position along 2516 axis (m): unlabelled chain',H(R.unl),'labelled',H(R.lab),'circle 1165 centre',+h(e1165.c).toFixed(7),'circle 1166 centre',+h(e1166.c).toFixed(7));}
// control: every other display face whose vertices lie on some native cylinder within 1e-5
let ctl=0,worst=0;
for(let fi=0;fi<faces.length;fi++){if(fi===75||fi===448)continue;const f=faces[fi];
  for(const n of m.faces){if(n.surface.type!=='cylinder')continue;let mx=0;for(const p of f.pos){mx=Math.max(mx,G.distSurface(p,n.surface));if(mx>1e-4)break;}
    if(mx<1e-4){ctl++;worst=Math.max(worst,mx);break;}}}
console.log('control: other display faces lying on a native cylinder within 1e-4 m:',ctl,'worst max vertex distance among them',worst.toExponential(2));
