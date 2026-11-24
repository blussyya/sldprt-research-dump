// Layout C faces: do their ids join the native body, and does the tag match the native surface type?
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),J=require(R+'/src/brep/display-join'),fs=require('fs');
const TAG={4001:'plane',4002:'cylinder',4003:'cone',4004:'sphere',4005:'torus',4006:'bspline',4007:'blend',4008:'offset',4009:'swept',4010:'spun'};
const tot={files:0,faces:0,joined:0,how:{},tagMatch:0,tagMismatch:0,typeless:0};const bad=[];
for(const f of process.argv.slice(2)){const buf=fs.readFileSync(f);let d,M;try{d=S.parse(buf);M=N.build(S.readBrep(buf).parsed);}catch(e){console.log('skip',f.slice(-30),e.message);continue;}
  const C=d.faces.map((x,i)=>[x,i]).filter(([x])=>x.metadata&&x.metadata.layout==='C');if(!C.length)continue;tot.files++;
  const js=J.join(d.faces,M);
  for(const [x,i] of C){tot.faces++;const j=js[i];tot.how[j.how]=(tot.how[j.how]||0)+1;if(!j.face)continue;tot.joined++;
    const want=TAG[x.metadata.typeTag],got=j.face.surface.type;
    if(!want)tot.typeless++;else if(want===got||(want==='blend'&&/blend|rolling/.test(got)))tot.tagMatch++;else{tot.tagMismatch++;if(bad.length<8)bad.push([f.slice(-28),i,want,got,j.how]);}}}
console.log(JSON.stringify(tot));bad.forEach(b=>console.log('  ',JSON.stringify(b)));
