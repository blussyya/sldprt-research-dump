'use strict';
// Scan 8: repeated display ids vs native bodies. Per part with repeated display rawId:
//  A) native: displayId groups, same-body collisions among native faces
//  B) display: join each display face to a native face (reader's own join), then for each repeated-id group:
//     do all members map to distinct native faces, in distinct bodies? two display faces on one native face = split face.
const S=require('/home/user/solidworks-converters/src');
const nat=require('/home/user/solidworks-converters/src/brep/native');
const J=require('/home/user/solidworks-converters/src/brep/display-join');
const R='/home/user/sldprt-research-dump/';
const parts=process.argv.slice(2);
for(const f of parts){
  const name=f.split('/').pop().slice(0,36);
  const d=S.parse(f);const r=S.readBrep(f);const M=nat.build(r.parsed);
  // A
  const byNat={};for(const nf of M.faces){const k=nf.displayId!==undefined?nf.displayId:nf.id;(byNat[k]=byNat[k]||[]).push(nf.body);}
  let sameBodyNat=0,multiNat=0;for(const [k,b] of Object.entries(byNat)){if(b.length>1)multiNat++;if(new Set(b).size<b.length)sameBodyNat++;}
  // B
  const jr=J.join(d.faces,M);
  const grp={};d.faces.forEach((df,i)=>{if(!df.metadata)return;(grp[df.metadata.rawId]=grp[df.metadata.rawId]||[]).push(i);});
  let rep=0,repMembers=0,distinctBody=0,sameBodyPair=0,sameNative=0,unresolved=0,sameTagBounds=0;
  const examples=[];
  for(const [id,idx] of Object.entries(grp)){if(idx.length<2)continue;rep++;repMembers+=idx.length;
    const res=idx.map(i=>jr[i]);
    if(res.some(x=>!x.face)){unresolved++;continue;}
    const bodies=res.map(x=>x.face.body),nfs=res.map(x=>x.face);
    if(new Set(nfs).size<nfs.length){sameNative++;examples.push(['sameNative',id,idx.join(',')]);}
    if(new Set(bodies).size===bodies.length)distinctBody++;else{sameBodyPair++;examples.push(['sameBody',id,idx.join(','),bodies.join(',')]);}
  }
  console.log(name.padEnd(36),'dispfaces',d.faces.length,'natfaces',M.faces.length,'bodies',M.bodies.length,'| native ids with >1 face',multiNat,'same-body native collisions',sameBodyNat,
   '| display repeated ids',rep,'(faces',repMembers+')','all-distinct-bodies',distinctBody,'some-same-body',sameBodyPair,'two-display-on-one-native',sameNative,'unresolved',unresolved);
  examples.slice(0,4).forEach(e=>console.log('    ',e.join(' ')));
}
