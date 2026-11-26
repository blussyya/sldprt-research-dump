// EXP-118: native face 2516's second loop (edges 1166 circle, 1093 intersection) traced with edge
// vertex order, edge sense and coedge sense, unrolled on the bore cylinder; its winding number around
// the axis (1 = wraps round the bore, 0 = an oval on the wall) and the angular span each edge covers.
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),fs=require('fs');
const M=N.build(S.readBrep(fs.readFileSync(process.argv[2])).parsed),nf=[...M.faces.values()].find(x=>x.id===2516),s=nf.surface;
const a=G.unit(s.a),x0=G.unit(s.x),y0=G.cross(a,x0),ang=p=>{const q=G.sub(p,s.p);return Math.atan2(G.dot(q,y0),G.dot(q,x0));},h=p=>G.dot(G.sub(p,s.p),a)*1000;
const P=v=>{const vv=M.vertices.get(v);return vv.p||vv.point;};
for(const [li,l] of nf.loops.entries()){let pts=[];
  for(const ce of l.coedges){const e=M.edges.get(ce.edge),c=e.curve,fwd=ce.sense!==false;let seg=[];
    if(c.type==='circle'&&e.v&&e.v.length===2){const t0=G.curveProject(c,P(e.v[0])).t,t1=G.curveProject(c,P(e.v[1])).t;
      // edge runs v0 -> v1 along the curve if sameSense, else against it
      let span=(e.sameSense===false)?-(((t0-t1)%(2*Math.PI))+2*Math.PI)%(2*Math.PI):(((t1-t0)%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
      for(let k=0;k<=60;k++)seg.push(G.curvePoint(c,t0+span*k/60));
      console.log(` loop ${li} edge ${e.displayId} circle: v0->v1 span ${(span*180/Math.PI).toFixed(1)} deg (edge sameSense ${e.sameSense}), coedge sense ${ce.sense}`);}
    else if(c.type==='circle'){for(let k=0;k<=60;k++)seg.push(G.curvePoint(c,2*Math.PI*k/60));console.log(` loop ${li} edge ${e.displayId} full circle, coedge sense ${ce.sense}`);}
    else if(c.chart){seg=c.chart.map(q=>q.p||q);const st=e.v?G.dist(seg[0],P(e.v[0])):NaN;console.log(` loop ${li} edge ${e.displayId} ${c.type}: ${seg.length} chart points, chart starts at v0 (${st.toExponential(1)} m), edge sameSense ${e.sameSense}, coedge sense ${ce.sense}; heights ${Math.min(...seg.map(h)).toFixed(3)} to ${Math.max(...seg.map(h)).toFixed(3)} mm`);}
    if(!fwd)seg.reverse();pts=pts.concat(seg);}
  let w=0;for(let k=1;k<pts.length;k++){let dt=ang(pts[k])-ang(pts[k-1]);if(dt>Math.PI)dt-=2*Math.PI;if(dt<-Math.PI)dt+=2*Math.PI;w+=dt;}
  console.log(` loop ${li}: winding around the bore axis ${(w/(2*Math.PI)).toFixed(3)} turns, heights ${Math.min(...pts.map(h)).toFixed(3)} to ${Math.max(...pts.map(h)).toFixed(3)} mm`);}
