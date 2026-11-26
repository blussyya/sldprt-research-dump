// The chart of intersection edge 1093 (and its mirror 11135): angle about cylinder 2516's axis and
// axial height of every chart point, and where the edge's vertices sit on it.
const L=require('./lib'),G=require('./geo');
const native=require('/home/user/solidworks-converters/src/brep/native');
const F='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const m=native.build(L.S.readBrep(F).parsed);
for(const [eid,sid] of [[1093,2516],[11135,12997]]){
const s=m.faces.find(x=>x.id===sid).surface,a=G.unit(s.a),x=G.unit(s.x),y=G.cross(a,x);
const th=p=>{const q=G.sub(p,s.p);let t=Math.atan2(G.dot(q,y),G.dot(q,x))*180/Math.PI;return t<0?t+360:t;},h=p=>G.dot(G.sub(p,s.p),a)*1000;
const e=m.edges.get(eid),c=e.curve;
console.log('edge',eid,'v',e.v,'sameSense',e.sameSense,'chart points',c.chart.length,'chordal',c.chordalError,'surfaces',c.surfaces.map(q=>q.type+'#'+q.node));
console.log(c.chart.map((p,i)=>i+':'+th(p).toFixed(1)+'/'+h(p).toFixed(3)).join(' '));
for(const v of e.v){const p=m.vertices.get(v).p;let best=1e9,bi=-1;for(let i=0;i+1<c.chart.length;i++){const d=G.distSeg(p,c.chart[i],c.chart[i+1]);if(d<best){best=d;bi=i;}}console.log(' vertex',v,'θ',th(p).toFixed(2),'h',h(p).toFixed(4),'nearest chart segment',bi,'dist',best.toExponential(2));}
console.log(' start limit',c.start&&c.start.type,c.start&&th(c.start.p).toFixed(2),'end limit',c.end&&c.end.type,c.end&&th(c.end.p).toFixed(2));
}
