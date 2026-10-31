// Independent exact intersection of offset9925 (param u,v) with the pipe of radius 2mm round 9930's spine.
// A different constraint from the converter's: one surface coordinate is held and the other root-found.
const L=require('./load.js'),{G,F,c,b}=L;
const [B0,O]=c.surfaces;
function mk(sp0){
 let tPrev=null;
 const proj=p=>{let t=tPrev===null?G.curveProject(sp0,p).t:tPrev;const [a,bb]=G.curveRange(sp0);
  for(let it=0;it<30;it++){const e=G.bsplineCurve(sp0,t),h=1e-7,e2=G.bsplineCurve(sp0,Math.min(bb,t+h)),e1=G.bsplineCurve(sp0,Math.max(a,t-h));
   const w=G.sub(e.p,p),g=G.dot(w,e.d),cpp=G.mul(G.sub(e2.d,e1.d),1/(Math.min(bb,t+h)-Math.max(a,t-h))),gp=G.dot(e.d,e.d)+G.dot(w,cpp);
   const st=g/gp;t=Math.min(bb,Math.max(a,t-st));if(Math.abs(st)<1e-15)break;}
  tPrev=t;return t;};
 const H=(u,v)=>{const e=G.surfaceEval(O,u,v),p=e.p,t=proj(p),C=G.curvePoint(sp0,t),w=G.sub(p,C),rho=G.norm(w),n=G.mul(w,1/rho);
  return {p,h:rho-0.002,hu:G.dot(n,e.du),hv:G.dot(n,e.dv),nu:G.norm(e.du),nv:G.norm(e.dv)};};
 function march(u,v,hint,stepFn,stopFn,maxN){
  let h=H(u,v);for(let i=0;i<6;i++){h=H(u,v);if(Math.abs(h.hu)*h.nu>=Math.abs(h.hv)*h.nv)u-=h.h/h.hu;else v-=h.h/h.hv;}
  h=H(u,v);const pts=[{u,v,p:h.p,h:h.h}];let dirU=hint[0],dirV=hint[1];
  for(let k=0;k<maxN;k++){
   const cur=pts[pts.length-1];if(stopFn(cur))break;
   const hh=H(cur.u,cur.v);
   // direction: previous step direction (secant) if available else tangent of the zero set
   if(k===0){let tu=-hh.hv,tv=hh.hu;const ph=Math.hypot(tu*hh.nu,tv*hh.nv);tu/=ph;tv/=ph;if(tu*hint[0]*hh.nu+tv*hint[1]*hh.nv<0){tu=-tu;tv=-tv}dirU=tu;dirV=tv;}
   let ds=stepFn(cur),done=false;
   for(let tries=0;tries<40&&!done;tries++){
     const pu=cur.u+dirU*ds,pv=cur.v+dirV*ds;
     const fixU=Math.abs(dirU)*hh.nu>=Math.abs(dirV)*hh.nv;
     let uu=pu,vv=pv,hq;
     for(let it=0;it<30;it++){hq=H(uu,vv);const st=hq.h/(fixU?hq.hv:hq.hu);if(fixU)vv-=st;else uu-=st;if(Math.abs(st)<1e-15*(1+Math.abs(fixU?vv:uu)))break;}
     hq=H(uu,vv);const step=G.dist(hq.p,cur.p);
     if(step>1.5*ds||step<0.3*ds||Math.abs(hq.h)>1e-13){ds/=2;continue;}
     // accept; new direction from secant
     const dU=uu-cur.u,dV=vv-cur.v,l=Math.hypot(dU*hh.nu,dV*hh.nv);dirU=dU/l;dirV=dV/l;
     pts.push({u:uu,v:vv,p:hq.p,h:hq.h});done=true;
   }
   if(!done)throw Error('march stuck at k='+k+' ds='+ds+' pos='+JSON.stringify(cur));
  }
  return pts;
 }
 return {H,march};
}
module.exports={mk,L};
