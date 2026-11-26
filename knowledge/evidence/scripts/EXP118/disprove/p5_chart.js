// Edge 1093 (and any edge given): its chart points, start/end limits, vertices, in the bore's
// cylinder coordinates; and the winding (unwrapped angle sweep) of each display boundary chain.
const L=require('./lib'),S=require(L.R+'/src'),N=require(L.R+'/src/brep/native'),G=require(L.R+'/src/geom/eval'),fs=require('fs');
const file='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const buf=fs.readFileSync(file),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed);
const nfid=+process.argv[2]||2516,eid=+process.argv[3]||1093,di=+process.argv[4]||75;
const nf=M.faces.find(f=>f.id===nfid),cyl=nf.surface,y=G.cross(cyl.a,cyl.x);
const cc=p=>{const q=G.sub(p,cyl.p),h=G.dot(q,cyl.a),r=Math.hypot(G.dot(q,cyl.x),G.dot(q,y));return {th:Math.atan2(G.dot(q,y),G.dot(q,cyl.x))*180/Math.PI,h:h*1000,dr:(r-cyl.r)*1e6};};
const e=M.edges.get(eid),c=e.curve;
console.log('edge',eid,c.type,'v',e.v,e.v.map(v=>cc(M.vertices.get(v).p)),'start lim',c.start&&cc(c.start.p),'end lim',c.end&&cc(c.end.p),'surfaces',c.surfaces&&c.surfaces.map(s=>s.type+'#'+s.node));
c.chart&&c.chart.forEach((p,i)=>{const o=cc(p.slice(0,3));console.log(' chart',i,'th',o.th.toFixed(2),'h',o.h.toFixed(4),'dr',o.dr.toFixed(2),'len',p.length);});
// display chains winding
const f=d.faces[di];const {E}=L.meshEdges(f);
const bnd=[...E].filter(([p,e])=>e.uses===1);
// walk all boundary segments (any id) into cycles by vertex degree 2
const adj=new Map();for(const [p,e] of bnd){const [a,b]=p.split('|');for(const [x,z] of [[a,b],[b,a]]){if(!adj.has(x))adj.set(x,[]);adj.get(x).push({to:z,id:e.ids.find(t=>t)||0});}}
console.log('display face',di,'boundary vertex degrees',[...adj.values()].reduce((h,v)=>(h[v.length]=(h[v.length]||0)+1,h),{}));
const seen=new Set();
for(const s of adj.keys()){if(seen.has(s))continue;let prev=null,cur=s,tot=0,ids={},n=0;const hs=[];
  do{seen.add(cur);const nx=adj.get(cur).find(x=>x.to!==prev)||adj.get(cur)[0];let a=cc(L.P(nx.to)).th-cc(L.P(cur)).th;while(a>180)a-=360;while(a<-180)a+=360;tot+=a;ids[nx.id]=(ids[nx.id]||0)+1;hs.push(cc(L.P(cur)).h);prev=cur;cur=nx.to;n++;}while(cur!==s&&n<10000);
  console.log(' cycle segs',n,'winding',tot.toFixed(1),'deg ids',JSON.stringify(ids),'h',Math.min(...hs).toFixed(4),Math.max(...hs).toFixed(4));}
