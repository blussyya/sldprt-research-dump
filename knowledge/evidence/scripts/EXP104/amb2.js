const C=require('./common');const J=require(C.SRC+'/brep/display-join');
const f=C.corpusFiles().find(x=>x.includes('d2515121'));const L=C.load(f);
const r=J.join(L.display,L.M);let n=0,shown=0;
r.forEach((x,i)=>{if(x.how!=='ambiguous')return;n++;const d=L.display[i];
  const c=L.M.faces.filter(q=>q.displayId===d.metadata.rawId&&q.surface.type==='plane');
  const ok=c.filter(q=>{const sh=C.onSurfaceShare(d,q,1e-5),b=C.inBounds(L.M,d,q);return sh>=0.5&&b!==false;});
  if(shown++<6)console.log('rawId',d.metadata.rawId,'vc',d.vertexCount,'bounds',d.bounds&&d.bounds.min.map(x=>+x.toFixed(4)),d.bounds&&d.bounds.max.map(x=>+x.toFixed(4)),'survivors',ok.length,ok.slice(0,3).map(q=>[q.body,q.id,q.surface.n.map(x=>+x.toFixed(2)).join(','),+(C.faceVertices(L.M,q).length),C.edgeIds(L.M,d,q)].join(':')).join(' '));
});console.log('amb',n);
