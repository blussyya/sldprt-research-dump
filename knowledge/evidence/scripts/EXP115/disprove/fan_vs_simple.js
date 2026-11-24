const {S,files}=require('./lib');const {fanWalk}=require('./fan');const {simpleLoops}=require('./simpleloops');
const T={faces:0,simpleHandled:0,agree:0,disagree:0,fanNotClosed:0,fanProblems:0,notPerm:0,sidesBad:0,twoSided:0,sameDirTwoSided:0,over2:0,fanOnly:0};
const bad=[];
for(const p of files()){
  const d=S.parse(p);let i=0;
  for(const f of d.faces){i++;if(f.noEdgeTable)continue;T.faces++;
    let r;try{r=fanWalk(f);}catch(e){bad.push([p,i,'throw '+e.message]);continue;}
    const sl=simpleLoops(f);
    if(r.loops.some(l=>!l.closed))T.fanNotClosed++;
    if(r.problems.length)T.fanProblems++;
    if(r.notPerm)T.notPerm++;
    for(const [k,l] of r.sides){if(l.length>2)T.over2++;if(l.length===2){T.twoSided++;if(l[0]===l[1])T.sameDirTwoSided++;}}
    if(sl){T.simpleHandled++;
      const canon=ls=>ls.map(l=>[...new Set(l.segs)].sort().join(';')).sort().join('#');
      // fan loop on simple faces must have each segment once
      const each=r.loops.every(l=>l.segs.length===new Set(l.segs).size);
      if(canon(sl)===canon(r.loops)&&each)T.agree++;else{T.disagree++;bad.push([p.replace(/.*test files /,''),i,'disagree']);}
    }else T.fanOnly++;
  }}
console.log(T);console.log(bad.slice(0,20));
