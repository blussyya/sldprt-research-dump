'use strict';
// Self-contained software renderer: no three.js, no CDN, no external deps.
// Consumes parser/v0.2 output directly so what you see IS what the parser emits.
const fs=require('fs'),zlib=require('zlib'),path=require('path');
const parser=require(require('path').join(__dirname,'..','parser','v0.2','src','parser-core'));

// ---------- PNG ----------
let CRCT=null;
function crcTable(){if(CRCT)return CRCT;CRCT=new Int32Array(256);
 for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;CRCT[n]=c;}return CRCT;}
function crc32(buf){const t=crcTable();let c=0xffffffff;
 for(let i=0;i<buf.length;i++)c=t[(c^buf[i])&0xff]^(c>>>8);return (c^0xffffffff)>>>0;}
function chunk(type,data){const len=Buffer.alloc(4);len.writeUInt32BE(data.length);
 const td=Buffer.concat([Buffer.from(type,'ascii'),data]);const c=Buffer.alloc(4);c.writeUInt32BE(crc32(td));
 return Buffer.concat([len,td,c]);}
function writePNG(file,W,H,rgb){
 const raw=Buffer.alloc((W*3+1)*H);
 for(let y=0;y<H;y++){raw[y*(W*3+1)]=0;rgb.copy(raw,y*(W*3+1)+1,y*W*3,(y+1)*W*3);}
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);
 ihdr[8]=8;ihdr[9]=2;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0;
 fs.writeFileSync(file,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
  chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]));
}
// ---------- vector ----------
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const nrm=a=>{const L=Math.hypot(...a);return L?[a[0]/L,a[1]/L,a[2]/L]:[0,0,0];};
function hsv(h,s,v){const i=Math.floor(h*6),f=h*6-i,p=v*(1-s),q=v*(1-f*s),t=v*(1-(1-f)*s);
 const m=[[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]][i%6];return m.map(x=>x*255);}

function render(model,outFile,opts){
 const W=opts.W||760,H=opts.H||760;
 const r=parser.parseSLDPRT(fs.readFileSync(model),zlib.inflateRawSync,zlib.inflateSync);
 if(!r.faces||!r.faces.length)throw new Error('no faces');
 // gather triangles straight from parser output
 const tris=[];const bedges=[];
 r.faces.forEach((f,fi)=>{
  const V=[];for(let i=0;i<f.vertexCount;i++)V.push([f.vertices[i*3],f.vertices[i*3+1],f.vertices[i*3+2]]);
  for(let t=0;t<f.triangleIndices.length;t+=3){
   const a=f.triangleIndices[t],b=f.triangleIndices[t+1],c=f.triangleIndices[t+2];
   tris.push({v:[V[a],V[b],V[c]],face:fi});}
  if(f.edgeAnnotations)for(const e of f.edgeAnnotations)
   if(e&&e.id!==0&&Array.isArray(e.vertices))bedges.push([V[e.vertices[0]],V[e.vertices[1]]]);
 });
 // bounds / camera (orthographic isometric)
 let lo=[1e30,1e30,1e30],hi=[-1e30,-1e30,-1e30];
 for(const t of tris)for(const p of t.v)for(let k=0;k<3;k++){if(p[k]<lo[k])lo[k]=p[k];if(p[k]>hi[k])hi[k]=p[k];}
 const ctr=[0,1,2].map(k=>(lo[k]+hi[k])/2), ext=Math.max(...[0,1,2].map(k=>hi[k]-lo[k]))||1;
 const az=opts.az??Math.PI/4, el=opts.el??Math.atan(Math.SQRT1_2);
 const fwd=nrm([Math.cos(el)*Math.cos(az),Math.cos(el)*Math.sin(az),Math.sin(el)]);
 let up=[0,0,1]; if(Math.abs(dot(fwd,up))>0.99)up=[0,1,0];
 const right=nrm(cross(up,fwd)), realUp=cross(fwd,right);
 const S=(Math.min(W,H)*0.40)/(ext*0.5*1.35);
 const proj=p=>{const d=sub(p,ctr);
  return [W/2+dot(d,right)*S, H/2-dot(d,realUp)*S, dot(d,fwd)];};
 const rgb=Buffer.alloc(W*H*3);
 for(let i=0;i<W*H;i++){const g=246;rgb[i*3]=g;rgb[i*3+1]=g;rgb[i*3+2]=g+3;}
 const zb=new Float64Array(W*H).fill(-Infinity);
 const light=nrm([0.4,0.5,0.85]);
 const nf=r.faces.length;
 for(const t of tris){
  const P=t.v.map(proj);
  const n=nrm(cross(sub(t.v[1],t.v[0]),sub(t.v[2],t.v[0])));
  let lam=Math.abs(dot(n,light));lam=0.28+0.72*lam;
  const base=hsv((t.face*0.61803398875)%1,0.42,0.97);
  const col=base.map(c=>Math.max(0,Math.min(255,c*lam)));
  const minx=Math.max(0,Math.floor(Math.min(P[0][0],P[1][0],P[2][0]))),
        maxx=Math.min(W-1,Math.ceil(Math.max(P[0][0],P[1][0],P[2][0]))),
        miny=Math.max(0,Math.floor(Math.min(P[0][1],P[1][1],P[2][1]))),
        maxy=Math.min(H-1,Math.ceil(Math.max(P[0][1],P[1][1],P[2][1])));
  const d=(P[1][0]-P[0][0])*(P[2][1]-P[0][1])-(P[2][0]-P[0][0])*(P[1][1]-P[0][1]);
  if(Math.abs(d)<1e-12)continue;
  for(let y=miny;y<=maxy;y++)for(let x=minx;x<=maxx;x++){
   const px=x+0.5,py=y+0.5;
   const w0=((P[1][0]-px)*(P[2][1]-py)-(P[2][0]-px)*(P[1][1]-py))/d;
   const w1=((P[2][0]-px)*(P[0][1]-py)-(P[0][0]-px)*(P[2][1]-py))/d;
   const w2=1-w0-w1;
   if(w0<-1e-9||w1<-1e-9||w2<-1e-9)continue;
   const z=w0*P[0][2]+w1*P[1][2]+w2*P[2][2];
   const idx=y*W+x;
   if(z>zb[idx]){zb[idx]=z;rgb[idx*3]=col[0];rgb[idx*3+1]=col[1];rgb[idx*3+2]=col[2];}
  }
 }
 // overlay boundary edges (nonzero Block1 annotations) with a small depth bias
 if(opts.edges!==false)for(const [A,B] of bedges){
  const p=proj(A),q=proj(B);
  const steps=Math.max(2,Math.ceil(Math.hypot(q[0]-p[0],q[1]-p[1])));
  for(let s=0;s<=steps;s++){
   const u=s/steps,x=Math.round(p[0]+(q[0]-p[0])*u),y=Math.round(p[1]+(q[1]-p[1])*u);
   const z=p[2]+(q[2]-p[2])*u;
   for(let dy=-1;dy<=0;dy++)for(let dx=-1;dx<=0;dx++){
    const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=H)continue;
    const idx=yy*W+xx;
    if(z>=zb[idx]-ext*0.01){rgb[idx*3]=25;rgb[idx*3+1]=28;rgb[idx*3+2]=36;}
   }}
 }
 writePNG(outFile,W,H,rgb);
 return {faces:r.faces.length,triangles:tris.length,boundaryEdges:bedges.length,stats:r.stats};
}
module.exports={render};
if(require.main===module&&process.argv[2]&&process.argv[2]!=='--all'){
 const [m,o]=process.argv.slice(2);
 console.log(JSON.stringify(render(m,o,{})));
}

// Batch entry point: regenerate every committed render under EXP051_renders/.
// Usage:  node v0.4.8/exp051_render_validation.js --all
if(require.main===module&&process.argv[2]==='--all'){
 const ROOT=path.join(__dirname,'..'),OUT=path.join(__dirname,'EXP051_renders');
 fs.mkdirSync(OUT,{recursive:true});
 const targets=[
  ['test files original/controlled/C03_cube_fillet_1mm/model.SLDPRT','C03.png'],
  ['test files original/controlled/C04_cube_hole_5mm/model.SLDPRT','C04.png'],
  ['test files original/controlled/C07_cube_two_holes/model.SLDPRT','C07.png'],
  ['test files original/controlled/C10_cube_shell_1mm/model.SLDPRT','C10.png'],
  ['test files original/usb hub case (ultimate test)/USB hub case TOP.SLDPRT','usbtop.png'],
  ['test files original/Pocket Wheel.SLDPRT','pocket.png'],
  ['test files original/Dekor.SLDPRT','dekor.png'],
 ];
 for(const [src,out] of targets){
  const s=render(path.join(ROOT,src),path.join(OUT,out),{});
  console.log(out.padEnd(12),JSON.stringify(s));
 }
}
