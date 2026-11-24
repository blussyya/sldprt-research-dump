'use strict';
const L=require('./lib');const root='/home/user/sldprt-research-dump/test files online/';
for(const f of ['2020/7841a106_6344428.SLDPRT','2024/4febfc67_6344149.SLDPRT','2024/1e794aad_6344387.SLDPRT']){
  const {dl}=L.dlOf(root+f);const R=L.rd(dl);const st=L.faceStarts(dl);
  console.log(f,'faces',st.length);
  let shown=0;const cnt={};
  st.forEach((B,i)=>{
    const r=L.readFace(R,B);
    const rad=R.f(B+84),d=R.f(B+92);
    const k=L.hdr(R,B+140,8,100);
    const next=(st[i+1]||dl.length);
    const key=r.layout+(r.noBlock?'-nb':r.bad?'-bad':'')+' d==2r:'+(Math.abs(d-2*rad)<1e-12*Math.max(1,d))+' K140='+k+' recLen='+(next-B);
    cnt[key]=(cnt[key]||0)+1;
    if(r.bad||(shown<1)){shown++;console.log(' face',i,key,'res',r.res,'\n  ',dl.slice(B+132,B+132+120).toString('hex').match(/.{8}/g).join(' '));
      // scan the record tail for 4001-4010 tags
    }
    // search whole record tail for u32 in 4001..4010 and any id-like block
    let hits=0;for(let o=B;o<next-3;o+=4){const v=dl.readUInt32LE(o);if(v>=4001&&v<=4010)hits++;}
    cnt['tagLikeWordsInRecord>0:'+(hits>0)]=(cnt['tagLikeWordsInRecord>0:'+(hits>0)]||0)+1;
  });
  console.log(cnt);
}
