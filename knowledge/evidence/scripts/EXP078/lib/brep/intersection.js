'use strict';
/* Exact-to-tolerance curves for Parasolid INTERSECTION edges.
 *
 * An INTERSECTION (node type 38) stores its two surfaces and a CHART: points that lie on both
 * surfaces exactly (to 3e-15 m on the corpus, EXP-077) but are far apart (chords stray up to
 * 2.5 mm). The curve itself is the surface-surface intersection. Here it is computed:
 *
 *   1. Walk the chart polyline from the edge's start to its end (or once round, for a ring).
 *   2. Put every sample exactly on both surfaces: Newton on d1(x) = 0, d2(x) = 0 and
 *      (x − q)·T = 0, where q is the polyline point and T the local direction.
 *   3. Tangent at each point = n1 × n2, oriented along the walk.
 *   4. Join the points with cubic Hermite pieces (exact positions and tangents) and split any
 *      piece whose midpoint is further than `tol` from the true curve, re-checking the halves.
 *   5. Return the pieces as one cubic B-spline (interior knots tripled, so each piece keeps its own
 *      Bezier points; tangents match across joins), parameter ≈ arc length.
 *
 * The result is a B-spline that stays within `tol` (default 1e-9 m) of the intersection at
 * every checked point, which is how STEP and every other kernel carries such curves.
 */
const G=require('../geom/eval');

const solve3=(A,b)=>{   // Cramer, rows of A
  const det=m=>m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])-m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])+m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
  const D=det(A);if(!D||!Number.isFinite(D))return null;
  return [0,1,2].map(k=>det(A.map((r,i)=>r.map((x,j)=>j===k?b[i]:x)))/D);
};

/* The point on both surfaces nearest q in the plane through q normal to T. */
function refine(s1,s2,q,T){
  let x=q.slice();
  for(let it=0;it<60;it++){
    const a=G.surfaceDistance(s1,x),b=G.surfaceDistance(s2,x);if(!a.n||!b.n)return null;
    const dx=solve3([a.n,b.n,T],[-a.d,-b.d,-G.dot(G.sub(x,q),T)]);if(!dx)return null;
    x=G.add(x,dx);if(G.norm(dx)<1e-15)break;
  }
  const a=G.surfaceDistance(s1,x),b=G.surfaceDistance(s2,x);
  return Math.max(Math.abs(a.d),Math.abs(b.d))<1e-11?x:null;
}
function tangentAt(s1,s2,x,hint){
  const t=G.cross(G.surfaceDistance(s1,x).n,G.surfaceDistance(s2,x).n),m=G.norm(t);
  if(m<1e-9)return null;   // surfaces tangent here; caller falls back
  const u=G.mul(t,1/m);return G.dot(u,hint)<0?G.mul(u,-1):u;
}

/* polyline helpers */
function polyline(pts){const s=[0];for(let i=1;i<pts.length;i++)s.push(s[i-1]+G.dist(pts[i-1],pts[i]));return s;}
function locate(pts,cum,p){   // arc-length parameter of the polyline point nearest p
  let best={s:0,d:Infinity};
  for(let i=1;i<pts.length;i++){const a=pts[i-1],ab=G.sub(pts[i],a),L=G.dot(ab,ab);const t=L?Math.max(0,Math.min(1,G.dot(G.sub(p,a),ab)/L)):0;
    const d=G.dist(p,G.add(a,G.mul(ab,t)));if(d<best.d)best={s:cum[i-1]+t*(cum[i]-cum[i-1]),d};}
  return best.s;
}
function at(pts,cum,s){   // point and direction of the polyline at arc length s
  const L=cum[cum.length-1];s=Math.max(0,Math.min(L,s));
  let i=1;while(i<cum.length-1&&cum[i]<s)i++;
  const a=pts[i-1],b=pts[i],h=cum[i]-cum[i-1],t=h?(s-cum[i-1])/h:0;
  return {q:G.add(a,G.mul(G.sub(b,a),t)),d:G.unit(G.sub(b,a))};
}

function hermite(P0,T0,P1,T1,h,t){
  const B=[P0,G.add(P0,G.mul(T0,h/3)),G.sub(P1,G.mul(T1,h/3)),P1],u=1-t;
  return G.add(G.add(G.mul(B[0],u*u*u),G.mul(B[1],3*u*u*t)),G.add(G.mul(B[2],3*u*t*t),G.mul(B[3],t*t*t)));
}
function hermiteTangent(P0,T0,P1,T1,h,t){
  const B=[P0,G.add(P0,G.mul(T0,h/3)),G.sub(P1,G.mul(T1,h/3)),P1],u=1-t;
  return G.unit(G.add(G.add(G.mul(G.sub(B[1],B[0]),u*u),G.mul(G.sub(B[2],B[1]),2*u*t)),G.mul(G.sub(B[3],B[2]),t*t)));
}

/* chart: array of points; closed: chart is a loop (first point = last point).
 * from/to: the edge's end points in walking order (null for a ring: start at chart[0]).
 * reverse: walk the chart backwards (edge runs against the chart). */
function intersectionCurve(s1,s2,chart,{from=null,to=null,closed=false,reverse=false,tol=1e-9,maxPoints=20000}={}){
  let pts=chart.slice();if(reverse)pts.reverse();
  const cum=polyline(pts),L=cum[cum.length-1];
  let s0,s1v;
  if(closed&&!from){s0=0;s1v=L;}
  else{
    s0=locate(pts,cum,from);s1v=locate(pts,cum,to);
    if(!closed&&s1v<s0){   // an open chart fixes the direction by itself
      pts.reverse();const c2=polyline(pts);cum.splice(0,cum.length,...c2);s0=locate(pts,cum,from);s1v=locate(pts,cum,to);
    }
    if(closed&&s1v<=s0+1e-12*L)s1v+=L;   // a loop that starts and ends at a vertex
  }
  const wrap=s=>closed?((s%L)+L)%L:s;
  const pointAt=s=>{const {q,d}=at(pts,cum,wrap(s));const x=refine(s1,s2,q,d);if(!x)throw Error('INTERSECTION: could not put a point on both surfaces');
    const t=tangentAt(s1,s2,x,d);return {x,t:t||d};};
  // initial samples: chart vertices between s0 and s1, plus the ends
  const ss=[s0];for(const c of (closed?[...cum,...cum.map(v=>v+L)]:cum))if(c>s0+1e-12*L&&c<s1v-1e-12*L)ss.push(c);ss.push(s1v);
  let nodes=ss.map(s=>({s,...pointAt(s)}));
  if(from){nodes[0].x=from;}if(to||(closed&&from)){nodes[nodes.length-1].x=to||from;}
  if(closed&&!from){nodes[nodes.length-1].x=nodes[0].x;nodes[nodes.length-1].t=nodes[0].t;}
  // at least 4 pieces so short curved edges still get checked
  const out=[nodes[0]];
  const stack=[];for(let i=nodes.length-1;i>0;i--)stack.push([nodes[i-1],nodes[i],0]);
  let worst=0;
  while(stack.length){
    const [a,b,depth]=stack.pop(),h=G.dist(a.x,b.x);
    const m=hermite(a.x,a.t,b.x,b.t,h,0.5),mt=hermiteTangent(a.x,a.t,b.x,b.t,h,0.5);
    const tm=refine(s1,s2,m,mt);if(!tm)throw Error('INTERSECTION: midpoint did not converge');
    const dev=G.dist(m,tm);
    if((dev>tol||depth<2)&&depth<40&&out.length+stack.length<maxPoints){
      const mid={s:(a.s+b.s)/2,x:tm,t:tangentAt(s1,s2,tm,mt)||mt};stack.push([mid,b,depth+1],[a,mid,depth+1]);
    }else{worst=Math.max(worst,dev);out.push(b);}
  }
  // pieces -> cubic B-spline
  const ctrl=[out[0].x],knots=[0,0,0,0];let u=0;
  for(let i=1;i<out.length;i++){const a=out[i-1],b=out[i],h=G.dist(a.x,b.x)||1e-12;
    ctrl.push(G.add(a.x,G.mul(a.t,h/3)),G.sub(b.x,G.mul(b.t,h/3)));u+=h;
    if(i<out.length-1){ctrl.push(b.x);knots.push(u,u,u);}else{ctrl.push(b.x);knots.push(u,u,u,u);}}
  // interior knots of multiplicity 3 keep every Bezier point (exactly the Hermite pieces)
  return {type:'bspline',degree:3,ctrl,weights:null,knots,closed:!!closed,periodic:false,deviation:worst,points:out.length};
}

module.exports={intersectionCurve,refine};
