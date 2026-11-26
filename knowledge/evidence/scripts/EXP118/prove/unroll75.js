// Unroll display face 75 on native cylinder 2516: angle about the axis (deg, from the cylinder's
// x axis) and axial height h (mm), per boundary group. Prints the angular coverage of each group,
// binned in 5 degree bins, so the arcs can be compared.
const L=require('./lib'),G=require('./geo');
const native=require('/home/user/solidworks-converters/src/brep/native');
const F='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const fi=+(process.argv[2]||75),sid=+(process.argv[3]||2516);
const {dl}=L.dlBytes(F);const conv=L.S.parse(F);const m=native.build(L.S.readBrep(F).parsed);
const f=L.readFace(dl,conv.faces[fi].offset),M=L.meshEdges(f),s=m.faces.find(x=>x.id===sid).surface;
const a=G.unit(s.a),x=G.unit(s.x),y=G.cross(a,x);
const th=p=>{const q=G.sub(p,s.p);let t=Math.atan2(G.dot(q,y),G.dot(q,x))*180/Math.PI;return t<0?t+360:t;},h=p=>G.dot(G.sub(p,s.p),a)*1000;
const groups={};for(const e of M.boundary){const id=e.ids.find(v=>v)||0;(groups[id]=groups[id]||[]).push(e);}
for(const id in groups){const segs=groups[id];const bins=new Set();let hs=[];let total=0;
  for(const sg of segs){const A=L.P(sg.a),B=L.P(sg.b);let ta=th(A),tb=th(B);let d=tb-ta;if(d>180)d-=360;if(d<-180)d+=360;total+=Math.abs(d);
    for(let k=0;k<=10;k++){const t=(ta+d*k/10+360)%360;bins.add(Math.floor(t/5));}hs.push(h(A),h(B));}
  const b=[...bins].sort((p,q)=>p-q);const runs=[];for(const v of b){if(runs.length&&runs[runs.length-1][1]===v-1)runs[runs.length-1][1]=v;else runs.push([v,v]);}
  console.log('group',id==0?'unlabelled':id,'segs',segs.length,'angular length (deg, sum of |dθ|)',total.toFixed(2),'5-deg bins covered',b.length,'runs',runs.map(r=>r[0]*5+'-'+(r[1]+1)*5).join(','),'h range mm',Math.min(...hs).toFixed(4),Math.max(...hs).toFixed(4));}
// the native vertices of the second loop
for(const v of [1908,1861]){const p=m.vertices.get(v);if(p)console.log('vertex',v,'θ',th(p.p).toFixed(3),'h',h(p.p).toFixed(4));}
