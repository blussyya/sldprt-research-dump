// dump bytes +84..+131 of each bounds record, with native surface type/sense, for one file
const S=require('/home/user/solidworks-converters/src');
const N=require('/home/user/solidworks-converters/src/brep/native'),J=require('/home/user/solidworks-converters/src/brep/display-join');
const f=process.argv[2];
const d=S.parse(f),M=N.build(S.readBrep(f).parsed),j=J.join(d.faces,M);
d.faces.forEach((fc,i)=>{
  const r=Buffer.from(fc.bounds.raw),nf=j[i].face;
  const u=o=>r.readUInt32LE(o),fl=o=>r.readFloatLE(o).toFixed(5);
  console.log(i,nf?nf.surface.type+(nf.sameSense?'':'-rev'):'?',j[i].how,'u92',u(92),'u96',u(96),'u100',u(100),'u104',u(104),'u108',u(108),'f',fl(112),fl(116),fl(120),fl(124),'u128',u(128));
});
