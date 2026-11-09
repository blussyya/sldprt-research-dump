const C=require('./common');const J=require(C.SRC+'/brep/display-join');
for(const pat of ['d2515121','3c4752f1']){
  const f=C.corpusFiles().find(x=>x.includes(pat));const L=C.load(f);
  const r=J.join(L.display,L.M);const st={};let shown=0;
  r.forEach((x,i)=>{if(x.how!=='ambiguous')return;const d=L.display[i];
    const c=L.M.faces.filter(n=>n.displayId===d.metadata.rawId&&n.surface.type===J.TAG_TYPE[d.metadata.typeTag]);
    const surv=c.filter(n=>C.edgeIds(L.M,d,n)==='same');
    const k='type '+J.TAG_TYPE[d.metadata.typeTag]+' candidates '+c.length+' edgeIdSame '+surv.length;st[k]=(st[k]||0)+1;
    if(shown++<3)console.log(pat,'rawId',d.metadata.rawId,'vc',d.vertexCount,'bodies',c.map(n=>n.body).join(','),c.map(n=>C.onSurfaceShare(d,n,1e-5)+'/'+C.inBounds(L.M,d,n)+'/'+C.faceVertices(L.M,n).length).join(' '));
  });console.log(pat,st);
}
