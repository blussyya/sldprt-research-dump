const C=require('./common');const J=require(C.SRC+'/brep/display-join');
const f=process.argv[2];const L=C.load(f);let n=0;const st={};
for(const [i,r] of J.join(L.display,L.M).entries()){
  const df=L.display[i];if(!r.face)continue;
  const mr=C.maxResidual(df,r.face),b=C.inBounds(L.M,df,r.face,1e-5);
  const k=(mr===null?'noRes':mr<=1e-5?'resOk':'resFail')+'/'+(b===null?'noB':b?'bOk':'bFail')+'/'+r.face.surface.type;st[k]=(st[k]||0)+1;
  if((mr!==null&&mr>1e-5||b===false)&&n++<6)console.log(r.face.surface.type,'res',mr,'b',b,'rawId',df.metadata.rawId,'vc',df.vertexCount);
}
console.log(st);
