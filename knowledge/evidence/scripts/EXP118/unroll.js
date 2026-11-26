// EXP-118: a display face on a cylinder, unrolled flat (arc length around the axis x height along it),
// triangles filled, labelled edges black, unlabelled mesh boundary red. Prints the empty area inside
// each unlabelled loop and the nearest face vertex off the loop (a crack shows as a near-zero gap).
// usage: node unroll.js <part> <face> <native cylinder face id> <out.png> [theta offset rad]
// env OVERLAY=id,id draws native edges by display id; HMIN=-8.5 extends the height range (mm)
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),fs=require('fs'),zlib=require('zlib');
const [file,fiS,nfS,out,offS]=process.argv.slice(2),buf=fs.readFileSync(file),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed),f=d.faces[+fiS];
const s=[...M.faces.values()].find(x=>x.id===+nfS).surface,a=G.unit(s.a),x0=G.unit(s.x||G.cross(a,[1,0,0])),y0=G.cross(a,x0),off=+(offS||0);
const V=i=>[0,1,2].map(k=>f.vertices[3*i+k]),uv=p=>{const q=G.sub(p,s.p);let th=Math.atan2(G.dot(q,y0),G.dot(q,x0))+off;th=((th%(2*Math.PI))+2*Math.PI)%(2*Math.PI);return [th*s.r*1000,G.dot(q,a)*1000];};
const T=[];for(let t=0;t<f.triangleIndices.length;t+=3)T.push([0,1,2].map(j=>f.triangleIndices[t+j]));
const key=i=>V(i).join(','),pk=(x,y)=>x<y?x+'|'+y:y+'|'+x,use=new Map();T.forEach(t=>{for(const [p,q] of [[0,1],[1,2],[0,2]]){const k=pk(key(t[p]),key(t[q]));use.set(k,(use.get(k)||0)+1);}});
const lab=new Set();for(const e of f.edgeAnnotations)if(e.id)lab.add(pk(key(e.vertices[0]),key(e.vertices[1])));
const pos=new Map();for(let i=0;i<f.vertexCount;i++)pos.set(key(i),V(i));
const red=[...use].filter(([k,n])=>n===1&&!lab.has(k)).map(([k])=>k.split('|'));
// bounds of the unrolled face
// env HMIN (mm): extend the picture down to that height, to show the native curve below the face
const U=[...pos.values()].map(uv),lo=[Math.min(...U.map(p=>p[0])),Math.min(...U.map(p=>p[1]),process.env.HMIN?+process.env.HMIN:Infinity)],hi=[Math.max(...U.map(p=>p[0])),Math.max(...U.map(p=>p[1]))];
const W=900,H=Math.max(300,Math.round(900*(hi[1]-lo[1])/(hi[0]-lo[0]))),pad=30,sc=(W-2*pad)/(hi[0]-lo[0]),X=p=>[pad+(p[0]-lo[0])*sc,H-pad-(p[1]-lo[1])*sc];
const rgb=Buffer.alloc(W*H*3,248);
const tri=(P,col)=>{const d0=(P[1][0]-P[0][0])*(P[2][1]-P[0][1])-(P[2][0]-P[0][0])*(P[1][1]-P[0][1]);if(Math.abs(d0)<1e-9)return;
  for(let y=Math.max(0,Math.floor(Math.min(...P.map(p=>p[1]))));y<=Math.min(H-1,Math.ceil(Math.max(...P.map(p=>p[1]))));y++)for(let x=Math.max(0,Math.floor(Math.min(...P.map(p=>p[0]))));x<=Math.min(W-1,Math.ceil(Math.max(...P.map(p=>p[0]))));x++){
    const px=x+.5,py=y+.5,w0=((P[1][0]-px)*(P[2][1]-py)-(P[2][0]-px)*(P[1][1]-py))/d0,w1=((P[2][0]-px)*(P[0][1]-py)-(P[0][0]-px)*(P[2][1]-py))/d0;if(w0<0||w1<0||1-w0-w1<0)continue;const i=y*W+x;rgb.set(col,3*i);}};
const line=(A,B,col,w)=>{const n=Math.max(2,Math.ceil(Math.hypot(B[0]-A[0],B[1]-A[1])));for(let k=0;k<=n;k++){const x=Math.round(A[0]+(B[0]-A[0])*k/n),y=Math.round(A[1]+(B[1]-A[1])*k/n);for(let dy=-w;dy<=w;dy++)for(let dx=-w;dx<=w;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<W&&yy<H)rgb.set(col,3*(yy*W+xx));}}};
const wrap=P=>Math.max(...P.map(p=>p[0]))-Math.min(...P.map(p=>p[0]))>(hi[0]-lo[0])*sc/2;   // pixels   // skip triangles across the seam of the unrolling
for(const t of T){const P=t.map(i=>X(uv(V(i))));if(!wrap(P))tri(P,[245,170,90]);}
for(const t of T){const P=t.map(i=>X(uv(V(i))));if(wrap(P))continue;for(const [p,q] of [[0,1],[1,2],[0,2]])line(P[p],P[q],[210,130,60],0);}
for(const e of f.edgeAnnotations)if(e.id){const P=[uv(V(e.vertices[0])),uv(V(e.vertices[1]))].map(X);if(!wrap(P))line(P[0],P[1],[20,20,30],1);}
for(const [A,B] of red){const P=[uv(pos.get(A)),uv(pos.get(B))].map(X);if(!wrap(P))line(P[0],P[1],[230,20,30],1);}
// overlay native edges given by display id (env OVERLAY=1166,1093): circles as their full line,
// intersection curves by their chart points, edge vertices as squares
if(process.env.OVERLAY){const cols=[[40,90,230],[20,160,60],[150,40,200]];process.env.OVERLAY.split(',').map(Number).forEach((id,ci)=>{
  const e=[...M.edges.values()].find(x=>x.displayId===id);if(!e)return;const c=e.curve,col=cols[ci%3];let pts=[];
  if(c.type==='circle')for(let k=0;k<=360;k++)pts.push(G.curvePoint(c,k/360*2*Math.PI));
  else if(c.chart)pts=c.chart.map(q=>q.p||q);
  const P=pts.map(uv).map(X);for(let k=1;k<P.length;k++){const A=P[k-1],B=P[k];if(Math.abs(A[0]-B[0])<W/2)line(A,B,col,c.type==='circle'?0:1);}
  if(c.type!=='circle')for(const q of P)line(q,q,col,2);
  for(const v of e.v||[]){const vv=M.vertices.get(v),pp=vv&&(vv.p||vv.point);if(pp){const q=X(uv(pp));for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++)if(Math.abs(dx)===5||Math.abs(dy)===5){const xx=Math.round(q[0])+dx,yy=Math.round(q[1])+dy;if(xx>=0&&yy>=0&&xx<W&&yy<H)rgb.set([40,90,230],3*(yy*W+xx));}}}
  console.log('overlay',id,c.type,'points',P.length);});}
// numbers: area enclosed by the red loop (shoelace in the unrolled plane), and nearest non-ring vertex
const ring=new Set(red.flat()),adj=new Map();for(const [A,B] of red){for(const [p,q] of [[A,B],[B,A]]){if(!adj.has(p))adj.set(p,[]);adj.get(p).push(q);}}
let order=[],cur=red[0][0],prev=null;do{order.push(cur);const nx=adj.get(cur).find(q=>q!==prev);prev=cur;cur=nx;}while(cur&&cur!==red[0][0]&&order.length<=ring.size);
const UP=order.map(k=>uv(pos.get(k)));let A2=0;for(let i=0;i<UP.length;i++){const p=UP[i],q=UP[(i+1)%UP.length];A2+=p[0]*q[1]-q[0]*p[1];}
let gap=Infinity;for(const k of ring){const p=pos.get(k);for(const [k2,p2] of pos)if(!ring.has(k2))gap=Math.min(gap,G.dist(p,p2));}
// triangles inside the ring (centroid inside the polygon)
const inside=pt=>{let c=false;for(let i=0,j=UP.length-1;i<UP.length;j=i++){const [xi,yi]=UP[i],[xj,yj]=UP[j];if((yi>pt[1])!==(yj>pt[1])&&pt[0]<(xj-xi)*(pt[1]-yi)/(yj-yi)+xi)c=!c;}return c;};
const inTri=T.filter(t=>inside([0,1].map(k=>t.reduce((sum,i)=>sum+uv(V(i))[k],0)/3))).length;
const raw=Buffer.alloc((W*3+1)*H);for(let y=0;y<H;y++)rgb.copy(raw,y*(W*3+1)+1,y*W*3,(y+1)*W*3);
const ct=new Int32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c;}),crc=b=>{let c=-1;for(const x of b)c=ct[(c^x)&255]^(c>>>8);return (c^-1)>>>0;};
const ch=(t,dat)=>{const l=Buffer.alloc(4);l.writeUInt32BE(dat.length);const td=Buffer.concat([Buffer.from(t),dat]),c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c]);};
const ih=Buffer.alloc(13);ih.writeUInt32BE(W,0);ih.writeUInt32BE(H,4);ih[8]=8;ih[9]=2;
fs.writeFileSync(out,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),ch('IHDR',ih),ch('IDAT',zlib.deflateSync(raw)),ch('IEND',Buffer.alloc(0))]));
console.log(out,`| unrolled ${(hi[0]-lo[0]).toFixed(3)} x ${(hi[1]-lo[1]).toFixed(3)} mm | red loop ${order.length} vertices, encloses ${Math.abs(A2/2).toFixed(4)} mm² | face triangles inside it: ${inTri} | nearest other face-75 vertex to the loop: ${gap.toExponential(2)} m`);
