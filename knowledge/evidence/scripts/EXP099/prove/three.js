// Per-record look at the 3 named parts: reserved words, tag at usual place, and any 4001-4010 word anywhere in the record tail.
const L=require('./lib');const R='/home/user/sldprt-research-dump/test files online/';
const P={'0739c559':'2015/0739c559_[HEAD-COVR-MIL1-COMN-00] Facemask & Mouthguard (Master).SLDPRT','7765d286':'2019/7765d286_NSJ8L.SLDPRT','eefa906d':'2018/eefa906d_plancher Dalle 2020.SLDPRT'};
const out={};
for(const k in P){const b=L.dlBytes(R+P[k]),sc=L.scan(b);const resSet={},tagc={},recs=[];let tail4k=0,withTail=0;
  sc.forEach((x,i)=>{const m=L.meta(b,x);const end=i+1<sc.length?sc[i+1].off:b.length;
    const rk=m.res.join(',');resSet[rk]=(resSet[rk]||0)+1;tagc[m.tag]=(tagc[m.tag]||0)+1;
    let hits=0;for(let q=m.resOff;q+4<=end;q+=1){const v=b.readUInt32LE(q);if(v>=4001&&v<=4010)hits++;}
    if(hits)withTail++;recs.push({off:x.off,res:m.res,tag:m.tag,tail4k:hits,tailLen:end-m.resOff});});
  out[k]={records:sc.length,reservedWordTuples:resSet,tagCounts:tagc,recordsWithAny4001_4010WordInTail:withTail,sample:recs.slice(0,4)};}
console.log(JSON.stringify(out,null,1));
