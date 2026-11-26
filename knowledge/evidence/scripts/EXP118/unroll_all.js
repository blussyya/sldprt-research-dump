// EXP-118: every display triangle whose three vertices lie on the bore cylinder (native face 2516's
// surface, within TOL) and within 4 mm of the bore, unrolled, coloured by display face (75 orange,
// others by index), with the native loop 1166/1093 overlaid. Prints per-face triangle counts and how
// much of the native face's area below circle 1166 is covered.
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),fs=require('fs'),zlib=require('zlib');
const [file,out,offS]=process.argv.slice(2),buf=fs.readFileSync(file),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed);
const nf=[...M.faces.values()].find(x=>x.id===2516),s=nf.surface,a=G.unit(s.a),x0=G.unit(s.x),y0=G.cross(a,x0),off=+offS,TOL=2e-6;
const uv=p=>{const q=G.sub(p,s.p);let th=Math.atan2(G.dot(q,y0),G.dot(q,x0))+off;th=((th%(2*Math.PI))+2*Math.PI)%(2*Math.PI);return [th*s.r*1000,G.dot(q,a)*1000];};
const C=[0.0465,0.01124,0.0300],tris=[],per={};
d.faces.forEach((f,fi)=>{for(let t=0;t<f.triangleIndices.length;t+=3){const v=[0,1,2].map(j=>[0,1,2].map(k=>f.vertices[3*f.triangleIndices[t+j]+k]));
  if(v.every(p=>Math.abs(G.surfaceDistance(s,p).d)<TOL&&G.dist(p,C)<0.004)){tris.push({fi,v});per[fi]=(per[fi]||0)+1;}}});
const ov=[];for(const id of [1166,1093]){const e=[...M.edges.values()].find(x=>x.displayId===id),c=e.curve;const pts=c.type==='circle'?Array.from({length:361},(_,k)=>G.curvePoint(c,k/360*2*Math.PI)):c.chart.map(q=>q.p||q);ov.push({id,pts:pts.map(uv)});}
const all=[...tris.flatMap(t=>t.v.map(uv)),...ov.flatMap(o=>o.pts)],lo=[0,Math.min(...all.map(p=>p[1]))],hi=[2*Math.PI*s.r*1000,Math.max(...all.map(p=>p[1]))];
const W=1000,pad=25,sc=(W-2*pad)/(hi[0]-lo[0]),H=Math.round((hi[1]-lo[1])*sc+2*pad),X=p=>[pad+(p[0]-lo[0])*sc,H-pad-(p[1]-lo[1])*sc];
const rgb=Buffer.alloc(W*H*3,248);
const fill=(P,col)=>{const d0=(P[1][0]-P[0][0])*(P[2][1]-P[0][1])-(P[2][0]-P[0][0])*(P[1][1]-P[0][1]);if(Math.abs(d0)<1e-9)return;for(let y=Math.max(0,Math.floor(Math.min(...P.map(p=>p[1]))));y<=Math.min(H-1,Math.ceil(Math.max(...P.map(p=>p[1]))));y++)for(let x=Math.max(0,Math.floor(Math.min(...P.map(p=>p[0]))));x<=Math.min(W-1,Math.ceil(Math.max(...P.map(p=>p[0]))));x++){const px=x+.5,py=y+.5,w0=((P[1][0]-px)*(P[2][1]-py)-(P[2][0]-px)*(P[1][1]-py))/d0,w1=((P[2][0]-px)*(P[0][1]-py)-(P[0][0]-px)*(P[2][1]-py))/d0;if(w0<0||w1<0||1-w0-w1<0)continue;rgb.set(col,3*(y*W+x));}};
const line=(A,B,col,w)=>{const n=Math.max(2,Math.ceil(Math.hypot(B[0]-A[0],B[1]-A[1])));for(let k=0;k<=n;k++){const x=Math.round(A[0]+(B[0]-A[0])*k/n),y=Math.round(A[1]+(B[1]-A[1])*k/n);for(let dy=-w;dy<=w;dy++)for(let dx=-w;dx<=w;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<W&&yy<H)rgb.set(col,3*(yy*W+xx));}}};
const palette=fi=>fi===75?[245,160,70]:[[120,170,230],[150,210,140],[210,150,210],[230,210,110],[140,200,200]][fi%5];
for(const t of tris){const P=t.v.map(uv).map(X);if(Math.max(...P.map(p=>p[0]))-Math.min(...P.map(p=>p[0]))>W/2)continue;fill(P,palette(t.fi));for(let k=0;k<3;k++)line(P[k],P[(k+1)%3],palette(t.fi).map(c=>c*0.7),0);}
for(const o of ov){const P=o.pts.map(X);for(let k=1;k<P.length;k++)if(Math.abs(P[k][0]-P[k-1][0])<W/2)line(P[k-1],P[k],o.id===1093?[20,140,50]:[40,80,220],o.id===1093?1:0);}
const raw=Buffer.alloc((W*3+1)*H);for(let y=0;y<H;y++)rgb.copy(raw,y*(W*3+1)+1,y*W*3,(y+1)*W*3);
const ct=new Int32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c;}),crc=b=>{let c=-1;for(const x of b)c=ct[(c^x)&255]^(c>>>8);return (c^-1)>>>0;};
const ch=(t,dat)=>{const l=Buffer.alloc(4);l.writeUInt32BE(dat.length);const td=Buffer.concat([Buffer.from(t),dat]),c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c]);};
const ih=Buffer.alloc(13);ih.writeUInt32BE(W,0);ih.writeUInt32BE(H,4);ih[8]=8;ih[9]=2;
fs.writeFileSync(out,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),ch('IHDR',ih),ch('IDAT',zlib.deflateSync(raw)),ch('IEND',Buffer.alloc(0))]));
console.log(out,'| triangles on the bore cylinder by display face:',JSON.stringify(per),'| unrolled height',(hi[1]-lo[1]).toFixed(3),'mm');
