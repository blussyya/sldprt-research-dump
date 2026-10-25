'use strict';
/* Native Parasolid body (xt.parse result) -> neutral B-rep model, the same shape as
 * src/step/read.js produces:
 *
 *   {vertices: Map id -> {id, p},
 *    edges:    Map id -> {id, v:[start, end] (null for a closed ring edge), curve, sameSense},
 *    faces:    [{id, surface, sameSense, loops:[{coedges:[{edge, sense}]} | {coedges:[], vertex}]}]}
 *
 * Conventions established on the corpus (docs/format/parasolid.md):
 *   - EDGE.fin is the edge's positive fin. A fin runs along its edge when its sense is '+'.
 *   - FIN.vertex is the vertex at the END of the fin, so an edge runs from
 *     other(fin).vertex to fin.vertex (432 line edges and 24 trimmed curves agree).
 *   - The edge runs along its curve when the curve's sense is '+'.
 *   - A face's outward normal is the surface's natural normal, reversed once for a '-' surface
 *     sense and once for a '-' face sense.
 * Edge, vertex and face ids are Parasolid node_ids, which are also the display-mesh IDs.
 */
const G=require('../geom/eval'),{intersectionCurve}=require('./intersection'),{fitCurve}=require('./fit'),{blendSurface,blendSurfaceRational}=require('./blend');
const parametrise=(...a)=>require('./volume').parametrise(...a);   // lazy: volume.js loads seams.js

function build(parsed){
  if(parsed.error)throw Error('B-rep not fully read: '+parsed.error);
  const m=new Map(parsed.nodes.map(n=>[n.index,n])),node=i=>{const n=m.get(i);if(!n)throw Error('B-rep: missing node '+i);return n;};
  const sgn=c=>c==='-'?-1:1;
  const arr=(i,key)=>node(i).values[key];

  function nurbsCurve(nc){
    const v=nc.values,dim=v.vertex_dim,flat=arr(v.bspline_vertices,'vertices'),mult=arr(v.knot_mult,'mult'),kn=arr(v.knots,'knots');
    const ctrl=[],weights=v.rational?[]:null;
    for(let i=0;i<v.n_vertices;i++){const q=flat.slice(i*dim,i*dim+dim);
      if(v.rational){const w=q[dim-1];weights.push(w);ctrl.push([q[0]/w,q[1]/w,q[2]/w]);}else ctrl.push(q.slice(0,3));}
    const knots=[];mult.forEach((k,i)=>{for(let j=0;j<k;j++)knots.push(kn[i]);});
    return {type:'bspline',degree:v.degree,ctrl,weights,knots,closed:!!v.closed,periodic:!!v.periodic};
  }
  function nurbsSurface(ns){
    const v=ns.values,dim=v.vertex_dim,flat=arr(v.bspline_vertices,'vertices');
    const knots=(mk,kk)=>{const mult=arr(mk,'mult'),kn=arr(kk,'knots'),out=[];mult.forEach((k,i)=>{for(let j=0;j<k;j++)out.push(kn[i]);});return out;};
    const ctrl=[],weights=v.rational?[]:null;
    for(let i=0;i<v.n_u_vertices;i++){ctrl.push([]);if(weights)weights.push([]);
      for(let j=0;j<v.n_v_vertices;j++){const o=(i*v.n_v_vertices+j)*dim,q=flat.slice(o,o+dim);   // v varies fastest
        if(v.rational){const w=q[dim-1];weights[i].push(w);ctrl[i].push([q[0]/w,q[1]/w,q[2]/w]);}else ctrl[i].push(q.slice(0,3));}}
    return {type:'bspline',du:v.u_degree,dv:v.v_degree,ctrl,weights,ku:knots(v.u_knot_mult,v.u_knots),kv:knots(v.v_knot_mult,v.v_knots),uPeriodic:!!v.u_periodic,vPeriodic:!!v.v_periodic};
  }
  function curve(i){
    const c=node(i),v=c.values;
    switch(c.name){
      case 'LINE':return {type:'line',p:v.pvec,d:G.unit(v.direction)};
      case 'CIRCLE':return {type:'circle',c:v.centre,n:G.unit(v.normal),x:G.unit(v.x_axis),r:v.radius};
      case 'ELLIPSE':return {type:'ellipse',c:v.centre,n:G.unit(v.normal),x:G.unit(v.x_axis),r1:v.major_radius,r2:v.minor_radius};
      case 'B_CURVE':return nurbsCurve(node(v.nurbs));
      case 'TRIMMED_CURVE':return {type:'trimmed',basis:curve(v.basis_curve),t0:v.parm_1,t1:v.parm_2,p0:v.point_1,p1:v.point_2};
      case 'INTERSECTION':return memo(i,()=>{   // a whole intersection (e.g. a blend spine), from chart end to chart end
        const ch=node(v.chart).values.hvec,closed=node(v.start).values.type==='H';
        const c=intersectionCurve(surface(v.surface[0]),surface(v.surface[1]),ch,closed?{closed:true}:{from:ch[0],to:ch[ch.length-1]});
        c.source={type:'INTERSECTION',node:i,points:c.points,deviation:c.deviation};return c;});
    }
    throw Error('B-rep: unsupported curve '+c.name+' (node '+i+')');
  }
  function surface(i){
    const s=node(i),v=s.values;
    switch(s.name){
      case 'PLANE':return {type:'plane',p:v.pvec,n:G.unit(v.normal),x:G.unit(v.x_axis)};
      case 'CYLINDER':return {type:'cylinder',p:v.pvec,a:G.unit(v.axis),x:G.unit(v.x_axis),r:v.radius};
      case 'CONE':return {type:'cone',p:v.pvec,a:G.unit(v.axis),x:G.unit(v.x_axis),r:v.radius,angle:Math.atan2(v.sin_half_angle,v.cos_half_angle)};
      case 'SPHERE':return {type:'sphere',c:v.centre,a:G.unit(v.axis),x:G.unit(v.x_axis),r:v.radius};
      case 'TORUS':return {type:'torus',c:v.centre,a:G.unit(v.axis),x:G.unit(v.x_axis),R:v.major_radius,r:v.minor_radius};
      case 'B_SURFACE':return nurbsSurface(node(v.nurbs));
      // SWEPT_SURF: the section curve translated along `sweep` (EXP-078; Dekor's 311 faces). `scale`
      // only scales the sweep parameter, so it doesn't change the surface.
      case 'SWEPT_SURF':return memo(i,()=>({type:'extrusion',curve:curve(v.section),d:G.unit(v.sweep),scale:v.scale}));
      case 'BLENDED_EDGE':return memo(i,()=>{
        const R=Math.max(Math.abs(v.range[0]),Math.abs(v.range[1]));
        const supports=v.surface.map((j,k)=>({surface:surface(j),sense:sgn(node(j).values.sense),range:v.range[k]}));
        return {type:'blend',spine:curve(v.spine),supports,R,blendType:v.blend_type,node:i};});
      case 'BLEND_BOUND':return memo(i,()=>({type:'blendbound',blend:surface(v.blend),k:v.boundary-1,node:i}));   // boundary is 1-based (EXP-078)
    }
    throw Error('B-rep: unsupported surface '+s.name+' (node '+i+')');
  }
  const cache=new Map(),memo=(i,f)=>{if(!cache.has(i))cache.set(i,f());return cache.get(i);};

  /* An edge's curve node, if it is an INTERSECTION or a trimmed one: the INTERSECTION node and
   * whether the edge runs along the chart's direction. */
  function intersectionOf(cn){
    if(cn.name==='INTERSECTION')return {node:cn,along:sgn(cn.values.sense)>0};
    if(cn.name==='TRIMMED_CURVE'){const b=node(cn.values.basis_curve);if(b.name==='INTERSECTION')return {node:b,along:sgn(cn.values.sense)*sgn(b.values.sense)>0};}
    return null;
  }
  /* A fin's own curve: TRIMMED_CURVE -> SP_CURVE -> 2D B_CURVE in the face surface's (u,v).
   * Returned as a 3D B-spline within 1e-9 m of S(u(t), v(t)), oriented along the fin, which for
   * the positive fin is along the edge. */
  function finCurve(fin){
    if(!fin.values.curve)return null;
    let tc=node(fin.values.curve),t0,t1,sense=sgn(tc.values.sense);
    if(tc.name==='TRIMMED_CURVE'){t0=tc.values.parm_1;t1=tc.values.parm_2;tc=node(tc.values.basis_curve);}
    if(tc.name!=='SP_CURVE')throw Error('B-rep: fin curve '+tc.name+' not supported');
    const par=parametrise(surface(tc.values.surface));if(!par)throw Error('B-rep: SP_CURVE on an unsupported surface');
    const bc=node(node(tc.values.b_curve).values.nurbs).values,dim=bc.vertex_dim,flat=arr(bc.bspline_vertices,'vertices');
    const ctrl=[],weights=bc.rational?[]:null;
    for(let i=0;i<bc.n_vertices;i++){const q=flat.slice(i*dim,i*dim+dim),w=bc.rational?q[dim-1]:1;if(weights)weights.push(w);ctrl.push([q[0]/w,q[1]/w,0]);}
    const knots=[];arr(bc.knot_mult,'mult').forEach((k,i)=>{for(let j=0;j<k;j++)knots.push(arr(bc.knots,'knots')[i]);});
    const uv={type:'bspline',degree:bc.degree,ctrl,weights,knots};
    if(t0===undefined){t0=knots[bc.degree];t1=knots[ctrl.length];}
    const evalAt=t=>{const c=G.bsplineCurve(uv,t),e=par.eval(c.p[0],c.p[1]);return {x:e.S,d:G.add(G.mul(e.Su,c.d[0]),G.mul(e.Sv,c.d[1]))};};
    const c=sense*sgn(tc.values.sense)>0?fitCurve(evalAt,t0,t1):fitCurve(t=>{const r=evalAt(t0+t1-t);return {x:r.x,d:G.mul(r.d,-1)};},t0,t1);
    c.source={type:'SP_CURVE',node:tc.index,points:c.points,deviation:c.deviation};
    return c;
  }
  /* A blend face as a fitted B-spline over the part of the spine its edges cover. Returns the
   * surface and flip = -1 when its natural normal points toward the spine (the blend's natural
   * normal points away from it). */
  function blendFace(b,loops){
    const {edgePath}=require('./volume'),ts=[];
    for(const l of loops)for(const co of l.coedges){const p=edgePath(edges.get(co.edge),vertices);
      for(let k=0;k<=16;k++)ts.push(G.curveProject(b.spine,G.curvePoint(p.c,p.t0+(p.t1-p.t0)*k/16)).t);}
    let t0,t1;
    if(G.periodic(b.spine)){ts.sort((x,y)=>x-y);let gap=-1,gi=0;
      for(let k=0;k<ts.length;k++){const g=(k+1<ts.length?ts[k+1]:ts[0]+G.TAU)-ts[k];if(g>gap){gap=g;gi=k;}}
      t0=ts[(gi+1)%ts.length];t1=ts[gi];if(t1<=t0)t1+=G.TAU;}
    else{t0=Math.min(...ts);t1=Math.max(...ts);}
    const supports=b.supports.map(s=>({foot:c=>{if(s.surface.type==='blend'&&s.surface.R===0)return G.curvePoint(s.surface.spine,G.curveProject(s.surface.spine,c).t);
      const r=G.surfaceDistance(s.surface,c);return G.sub(c,G.mul(r.n,r.d));}}));
    // SolidWorks' form first (exact arcs across, cubic along the spine); bicubic fit if it can't converge
    const fit=blendSurfaceRational({spine:b.spine,supports,t0,t1})||blendSurface({spine:b.spine,supports,t0,t1});
    const um=(t0+t1)/2,e=G.bsplineSurface(fit,um,0.5),c=G.curvePoint(b.spine,um);
    fit.source={type:'BLENDED_EDGE',node:b.node,R:b.R,deviation:fit.deviation,grid:fit.grid,form:fit.form||'bicubic'};
    return {surface:fit,flip:G.dot(G.cross(e.du,e.dv),G.sub(e.p,c))>0?1:-1};
  }
  const vertices=new Map(),edges=new Map(),faces=[];
  const vertex=i=>{if(!i)return null;const n=node(i);if(!vertices.has(n.values.node_id))vertices.set(n.values.node_id,{id:n.values.node_id,p:node(n.values.point).values.pvec});return n.values.node_id;};
  for(const e of parsed.nodes.filter(n=>n.type===16)){
    const f=node(e.values.fin);if(f.values.sense!=='+')throw Error('B-rep: edge '+e.values.node_id+' positive fin has sense '+f.values.sense);
    const o=node(f.values.other),cn=e.values.curve?node(e.values.curve):null;
    if(!cn){   // tolerant edge: the geometry is on the fins, one 2D curve per face (EXP-077)
      const start=vertex(o.values.vertex),end=vertex(f.values.vertex),c=finCurve(f);
      if(!c)throw Error('B-rep: edge '+e.values.node_id+' has no curve');
      edges.set(e.values.node_id,{id:e.values.node_id,v:start===null&&end===null?null:[start,end],curve:c,sameSense:true,tolerance:e.values.tolerance});continue;
    }
    const start=vertex(o.values.vertex),end=vertex(f.values.vertex);
    const v=start===null&&end===null?null:[start,end];
    const x=intersectionOf(cn);
    if(x){   // computed to tolerance, oriented along the edge
      const P=id=>id===null?null:vertices.get(id).p,closed=node(x.node.values.start).values.type==='H';
      const c=intersectionCurve(surface(x.node.values.surface[0]),surface(x.node.values.surface[1]),node(x.node.values.chart).values.hvec,
        {from:P(start),to:P(end),closed,reverse:!x.along});
      c.source={type:'INTERSECTION',node:x.node.index,points:c.points,deviation:c.deviation};
      edges.set(e.values.node_id,{id:e.values.node_id,v,curve:c,sameSense:true,tolerance:e.values.tolerance});continue;
    }
    // a trimmed curve runs along its basis when its own sense and the basis' sense agree (USB hub TOP
    // has '+' trimmed curves on '-' circles; no controlled model does)
    const along=sgn(cn.values.sense)*(cn.name==='TRIMMED_CURVE'?sgn(node(cn.values.basis_curve).values.sense):1);
    edges.set(e.values.node_id,{id:e.values.node_id,v,curve:curve(e.values.curve),sameSense:along>0,tolerance:e.values.tolerance});
  }
  for(const f of parsed.nodes.filter(n=>n.type===14)){
    const sn=node(f.values.surface),loops=[];
    for(let l=f.values.loop;l;l=node(l).values.next){
      const first=node(l).values.fin,co=[];let x=first,guard=0,lone=null;
      do{const fin=node(x);if(fin.values.edge)co.push({edge:node(fin.values.edge).values.node_id,sense:fin.values.sense==='+'});else lone=fin.values.vertex;
        x=fin.values.forward;if(++guard>1e6)throw Error('B-rep: open fin ring');}while(x!==first);
      // a loop whose only fin has no edge is a single vertex, e.g. a cone apex
      loops.push(co.length?{coedges:co}:{coedges:[],vertex:vertex(lone)});
    }
    let surf=surface(f.values.surface),flip=1;
    if(surf.type==='blend'){const r=blendFace(surf,loops);surf=r.surface;flip=r.flip;}
    faces.push({id:f.values.node_id,surface:surf,sameSense:sgn(sn.values.sense)*sgn(f.values.sense)*flip>0,loops});
  }
  for(const v of parsed.nodes.filter(n=>n.type===18))vertex(v.index);
  return {source:'parasolid',unit:'m',vertices,edges,faces};
}

module.exports={build};
