// Own geometry helpers: distances to analytic curves and surfaces, polyline distance.
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>Math.hypot(...a),unit=a=>mul(a,1/norm(a));
const perp=(q,a)=>sub(q,mul(a,dot(q,a)));
function distLine(p,c){return norm(perp(sub(p,c.p),unit(c.d)));}
function distCircle(p,c){const n=unit(c.n),q=sub(p,c.c),h=dot(q,n),r=norm(perp(q,n));return Math.hypot(h,r-c.r);}
function angleOnCircle(p,c){const n=unit(c.n),x=unit(c.x),y=cross(n,x),q=sub(p,c.c);let t=Math.atan2(dot(q,y),dot(q,x));if(t<0)t+=2*Math.PI;return t;}
function distSeg(p,a,b){const ab=sub(b,a),L=dot(ab,ab);let t=L?dot(sub(p,a),ab)/L:0;t=Math.max(0,Math.min(1,t));return norm(sub(p,add(a,mul(ab,t))));}
function distPolyline(p,pts){let d=Infinity;for(let i=0;i+1<pts.length;i++)d=Math.min(d,distSeg(p,pts[i],pts[i+1]));return d;}
function distSurface(p,s){switch(s.type){
  case 'plane':return Math.abs(dot(sub(p,s.p),unit(s.n)));
  case 'cylinder':return Math.abs(norm(perp(sub(p,s.p),unit(s.a)))-s.r);
  case 'sphere':return Math.abs(norm(sub(p,s.c))-s.r);
  case 'cone':{const a=unit(s.a),q=sub(p,s.p),rho=norm(perp(q,a));return Math.abs((rho-(s.r+dot(q,a)*Math.tan(s.angle)))*Math.cos(s.angle));}
  case 'torus':{const a=unit(s.a),q=sub(p,s.c),rad=perp(q,a),rho=norm(rad);return Math.abs(norm(sub(q,mul(rad,s.R/rho)))-s.r);}
  case 'offset':{if(['plane','cylinder','sphere'].includes(s.basis.type)){ // offset of analytic: distance to basis minus |d| (sided ignored)
      const b=s.basis;if(b.type==='plane'){const d=dot(sub(p,b.p),unit(b.n));return Math.abs(Math.abs(d)-Math.abs(s.d));}
      if(b.type==='cylinder'){const rho=norm(perp(sub(p,b.p),unit(b.a)));return Math.abs(rho-(b.r+s.d*(b.sense||1)));}
      if(b.type==='sphere'){return Math.abs(norm(sub(p,b.c))-(b.r+s.d*(b.sense||1)));}}
    return null;}
  }return null;}
module.exports={sub,add,mul,dot,cross,norm,unit,perp,distLine,distCircle,angleOnCircle,distSeg,distPolyline,distSurface};
