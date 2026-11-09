const S=require('/home/user/conv-dev/src');
const R='/home/user/sldprt-research-dump/test files online/';
for(const f of ['2019/7765d286_NSJ8L.SLDPRT','2018/eefa906d_plancher Dalle 2020.SLDPRT','2015/0739c559_[HEAD-COVR-MIL1-COMN-00] Facemask & Mouthguard (Master).SLDPRT']){
  const d=S.parse(R+f);const e={};d.faces.forEach(x=>{const k=x.metadataError||'ok:'+x.metadata.typeTag;e[k]=(e[k]||0)+1;});
  console.log(f,d.format,d.faces.length,'rejected',d.rejected.length,JSON.stringify(e));
  console.log(' bounds null:',d.faces.filter(x=>!x.bounds).length, 'overlays',d.overlays.length);
}
