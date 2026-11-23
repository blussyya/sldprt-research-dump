const C=require('./common');const J=require(C.SRC+'/brep/display-join');
const L=C.load(process.argv[2]);
let shown=0;
for(const [i,r] of J.join(L.display,L.M).entries()){const df=L.display[i];
  if(!r.face||r.face.surface.type!=='cylinder')continue;
  const rs=[];for(let k=0;k<df.vertexCount;k++)rs.push(C.residual(r.face.surface,[df.vertices[3*k],df.vertices[3*k+1],df.vertices[3*k+2]]));
  const mn=Math.min(...rs),mx=Math.max(...rs);
  if(Math.max(Math.abs(mn),Math.abs(mx))>1e-5&&shown++<4){console.log('rawId',df.metadata.rawId,'r',r.face.surface.r,'res min',mn,'max',mx,'vc',df.vertexCount,'p0',[...df.vertices.slice(0,3)],'axis',r.face.surface.a,'p',r.face.surface.p);}
}
