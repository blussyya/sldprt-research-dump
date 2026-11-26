// EXP-118: close-up render of a display face and everything within RAD of a point. Triangles shaded,
// the face itself orange, others grey; Block1-labelled edges black; the face's unlabelled mesh
// boundary (one triangle, id 0) red. Four views tiled 2x2.
// usage: node closeup.js <part> <face index> <cx,cy,cz> <radius m> <out.png> [axis x,y,z]
const R='/home/user/solidworks-converters',S=require(R+'/src'),fs=require('fs'),zlib=require('zlib');
const [file,fiS,cS,radS,out,axS]=process.argv.slice(2),FI=+fiS,C=cS.split(',').map(Number),RAD=+radS,AX=axS?axS.split(',').map(Number):null;
const d=S.parse(fs.readFileSync(file));
const sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],nrm=a=>{const l=Math.hypot(...a)||1;return a.map(x=>x/l);};
const tris=[],black=[],red=[];
d.faces.forEach((f,fi)=>{const V=i=>[0,1,2].map(k=>f.vertices[3*i+k]);
  const near=p=>Math.hypot(...sub(p,C))<RAD;
  for(let t=0;t<f.triangleIndices.length;t+=3){const v=[0,1,2].map(j=>V(f.triangleIndices[t+j]));if(v.some(near))tris.push({v,me:fi===FI});}
  if(!f.edgeAnnotations)return;
  const key=i=>V(i).join(','),pk=(a,b)=>a<b?a+'|'+b:b+'|'+a,use=new Map(),P=new Map();
  for(let t=0;t<f.triangleIndices.length;t+=3){const ix=[0,1,2].map(j=>f.triangleIndices[t+j]);for(const [a,b] of [[0,1],[1,2],[0,2]]){const k=pk(key(ix[a]),key(ix[b]));use.set(k,(use.get(k)||0)+1);P.set(k,[V(ix[a]),V(ix[b])]);}}
  const lab=new Set();for(const e of f.edgeAnnotations)if(e.id){lab.add(pk(key(e.vertices[0]),key(e.vertices[1])));const s=[V(e.vertices[0]),V(e.vertices[1])];if(near(s[0])||near(s[1]))black.push(s);}
  if(fi===FI)for(const [k,n] of use)if(n===1&&!lab.has(k))red.push(P.get(k));
});
const W=700,H=700;
function view(dir){
  const fwd=nrm(dir);let up=[0,0,1];if(Math.abs(dot(fwd,up))>0.95)up=[0,1,0];const right=nrm(cross(up,fwd)),realUp=cross(fwd,right);
  const Sx=W*0.45/RAD,proj=p=>{const q=sub(p,C);return [W/2+dot(q,right)*Sx,H/2-dot(q,realUp)*Sx,dot(q,fwd)];};
  const rgb=Buffer.alloc(W*H*3,246),zb=new Float64Array(W*H).fill(-Infinity),light=nrm([0.3,0.5,0.8]);
  for(const t of tris){const P=t.v.map(proj),n=nrm(cross(sub(t.v[1],t.v[0]),sub(t.v[2],t.v[0])));const lam=0.3+0.7*Math.abs(dot(n,light));
    const col=(t.me?[245,150,60]:[175,182,195]).map(c=>c*lam);
    const d0=(P[1][0]-P[0][0])*(P[2][1]-P[0][1])-(P[2][0]-P[0][0])*(P[1][1]-P[0][1]);if(Math.abs(d0)<1e-12)continue;
    const x0=Math.max(0,Math.floor(Math.min(P[0][0],P[1][0],P[2][0]))),x1=Math.min(W-1,Math.ceil(Math.max(P[0][0],P[1][0],P[2][0]))),y0=Math.max(0,Math.floor(Math.min(P[0][1],P[1][1],P[2][1]))),y1=Math.min(H-1,Math.ceil(Math.max(P[0][1],P[1][1],P[2][1])));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const px=x+.5,py=y+.5,w0=((P[1][0]-px)*(P[2][1]-py)-(P[2][0]-px)*(P[1][1]-py))/d0,w1=((P[2][0]-px)*(P[0][1]-py)-(P[0][0]-px)*(P[2][1]-py))/d0,w2=1-w0-w1;
      if(w0<-1e-9||w1<-1e-9||w2<-1e-9)continue;const z=w0*P[0][2]+w1*P[1][2]+w2*P[2][2],i=y*W+x;if(z>zb[i]){zb[i]=z;rgb[3*i]=col[0];rgb[3*i+1]=col[1];rgb[3*i+2]=col[2];}}}
  const line=(A,B,col,wid)=>{const p=proj(A),q=proj(B),n=Math.max(2,Math.ceil(Math.hypot(q[0]-p[0],q[1]-p[1])));for(let s=0;s<=n;s++){const u=s/n,x=Math.round(p[0]+(q[0]-p[0])*u),y=Math.round(p[1]+(q[1]-p[1])*u),z=p[2]+(q[2]-p[2])*u;
    for(let dy=-wid;dy<=wid;dy++)for(let dx=-wid;dx<=wid;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=H)continue;const i=yy*W+xx;if(col[0]>200||z>=zb[i]-RAD*0.05){rgb[3*i]=col[0];rgb[3*i+1]=col[1];rgb[3*i+2]=col[2];}}}};
  for(const [A,B] of black)line(A,B,[20,22,30],0);for(const [A,B] of red)line(A,B,[230,20,30],1);
  return rgb;}
const dirs=AX?[AX,AX.map(x=>-x),[1,0.3,0.2],[-0.4,1,0.5]]:[[1,0,0],[0,1,0],[0,0,1],[1,1,1]];
const views=dirs.map(view),G=6,TW=2*W+3*G,TH=2*H+3*G,img=Buffer.alloc(TW*TH*3,215);
views.forEach((v,k)=>{const ox=G+(k%2)*(W+G),oy=G+Math.floor(k/2)*(H+G);for(let y=0;y<H;y++)v.copy(img,((oy+y)*TW+ox)*3,y*W*3,(y+1)*W*3);});
const raw=Buffer.alloc((TW*3+1)*TH);for(let y=0;y<TH;y++){raw[y*(TW*3+1)]=0;img.copy(raw,y*(TW*3+1)+1,y*TW*3,(y+1)*TW*3);}
const crcT=new Int32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c;}),crc=b=>{let c=-1;for(const x of b)c=crcT[(c^x)&255]^(c>>>8);return (c^-1)>>>0;};
const chunk=(t,dat)=>{const l=Buffer.alloc(4);l.writeUInt32BE(dat.length);const td=Buffer.concat([Buffer.from(t),dat]),c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c]);};
const ih=Buffer.alloc(13);ih.writeUInt32BE(TW,0);ih.writeUInt32BE(TH,4);ih[8]=8;ih[9]=2;
fs.writeFileSync(out,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));
console.log(out,'| triangles drawn',tris.length,'| labelled edges',black.length,'| unlabelled boundary edges (red)',red.length);
