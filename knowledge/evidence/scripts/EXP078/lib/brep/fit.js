'use strict';
/* Cubic B-spline through exact points with exact tangents, refined until it is within `tol` of
 * the true curve. Used for curves that STEP can only carry as B-splines: Parasolid INTERSECTION
 * curves and surface-parameter (SP) curves.
 *
 *   fitCurve(evalAt, t0, t1, {tol, minDepth, maxDepth}) where evalAt(t) -> {x, d}
 *     x: the exact point at curve parameter t, d: the exact derivative dx/dt (not normalised).
 *
 * Pieces are cubic Hermite segments; each is split while the point at its middle parameter is
 * further than tol from the true point there. The result keeps every piece's Bezier points
 * (interior knots of multiplicity 3) and is parametrised by t itself.
 */
const G=require('../geom/eval');

function hermite(a,b,u){   // a,b: {t,x,d}; u in [0,1]
  const h=b.t-a.t,P=[a.x,G.add(a.x,G.mul(a.d,h/3)),G.sub(b.x,G.mul(b.d,h/3)),b.x],w=1-u;
  return G.add(G.add(G.mul(P[0],w*w*w),G.mul(P[1],3*w*w*u)),G.add(G.mul(P[2],3*w*u*u),G.mul(P[3],u*u*u)));
}
function fitCurve(evalAt,t0,t1,{tol=1e-9,minDepth=2,maxDepth=30,maxPieces=20000}={}){
  const node=t=>({t,...evalAt(t)});
  const out=[node(t0)],stack=[[out[0],node(t1),0]];let worst=0;
  while(stack.length){
    const [a,b,depth]=stack.pop(),m=node((a.t+b.t)/2),dev=G.dist(hermite(a,b,0.5),m.x);
    if((dev>tol||depth<minDepth)&&depth<maxDepth&&out.length+stack.length<maxPieces)stack.push([m,b,depth+1],[a,m,depth+1]);
    else{worst=Math.max(worst,dev);out.push(b);}
  }
  const ctrl=[out[0].x],knots=[t0,t0,t0,t0];
  for(let i=1;i<out.length;i++){const a=out[i-1],b=out[i],h=b.t-a.t;
    ctrl.push(G.add(a.x,G.mul(a.d,h/3)),G.sub(b.x,G.mul(b.d,h/3)),b.x);
    knots.push(b.t,b.t,b.t);}
  knots.push(t1);
  return {type:'bspline',degree:3,ctrl,weights:null,knots,closed:false,periodic:false,deviation:worst,points:out.length};
}

module.exports={fitCurve};
