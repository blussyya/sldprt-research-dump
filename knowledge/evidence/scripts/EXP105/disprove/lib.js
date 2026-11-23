'use strict';
// own closed-form distances (double precision), independent of display-join.residual
const S=require('/home/user/solidworks-converters/src');
const J=require('/home/user/solidworks-converters/src/brep/display-join');
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const len=a=>Math.sqrt(dot(a,a));
// signed distance to infinite cylinder: radial distance minus r
function dCyl(s,p){const q=sub(p,s.p),h=dot(q,s.a);const rad=[q[0]-h*s.a[0],q[1]-h*s.a[1],q[2]-h*s.a[2]];return len(rad)-s.r;}
// perpendicular distance in the (rho,h) half plane to the generatrix line rho=r+h*tan(angle)
function dCone(s,p){const q=sub(p,s.p),h=dot(q,s.a);const rad=[q[0]-h*s.a[0],q[1]-h*s.a[1],q[2]-h*s.a[2]];const rho=len(rad);
  const t=Math.tan(s.angle);return (rho-(s.r+h*t))/Math.sqrt(1+t*t);}
function dPlane(s,p){return dot(sub(p,s.p),s.n);}
function dSurf(s,p){return s.type==='cylinder'?dCyl(s,p):s.type==='cone'?dCone(s,p):s.type==='plane'?dPlane(s,p):null;}
function load(file){
  const d=S.parse(file),br=S.readBrep(file),M=S.brep.model(br.parsed);
  const j=J.join(d.faces,M);return {d,M,j};
}
function segDist(p,a,b){const ab=sub(b,a),ap=sub(p,a);let t=dot(ap,ab)/dot(ab,ab);t=Math.max(0,Math.min(1,t));
  const c=[a[0]+t*ab[0],a[1]+t*ab[1],a[2]+t*ab[2]];return len(sub(p,c));}
const V=(f,i)=>[f.vertices[3*i],f.vertices[3*i+1],f.vertices[3*i+2]];
module.exports={S,J,dCyl,dCone,dPlane,dSurf,load,segDist,V,sub,dot,len};
