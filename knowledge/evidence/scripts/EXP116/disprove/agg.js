const rows=JSON.parse(require('fs').readFileSync('/tmp/claude-0/-home-user/07cc0b43-8431-53bf-9c6e-c1eac6d58a3f/scratchpad/join.json'));
const grp=r=>r.lay==='C'?'C':(r.lay==='A'?'A':r.lay);
// tag->type table learned from layout A with a unique candidate
const tab={};
for(const r of rows)if(r.lay==='A'&&r.tag&&r.ncand===1){(tab[r.tag]=tab[r.tag]||{})[r.ntype]=(tab[r.tag][r.ntype]||0)+1;}
console.log('A tag->native type',JSON.stringify(tab));
const tabC={};
for(const r of rows)if(r.lay==='C'&&r.tag&&r.ncand===1){(tabC[r.tag]=tabC[r.tag]||{})[r.ntype]=(tabC[r.tag][r.ntype]||0)+1;}
console.log('C tag->native type',JSON.stringify(tabC));
const best={};for(const t in tab)best[t]=Object.entries(tab[t]).sort((a,b)=>b[1]-a[1])[0][0];
for(const g of ['A','C','B']){
  const R=rows.filter(r=>grp(r)===g);const id=R.filter(r=>r.id!==null);
  const noNative=id.filter(r=>r.nat===null).length;
  const J=id.filter(r=>r.nat!==null);
  const c0=J.filter(r=>r.ncand===0).length,c1=J.filter(r=>r.ncand===1).length,cm=J.filter(r=>r.ncand>1).length;
  const u=J.filter(r=>r.ncand===1);
  const tagOK=u.filter(r=>best[r.tag]===r.ntype).length;
  const res=u.filter(r=>r.res!==null&&r.res!==undefined);
  const resOK=res.filter(r=>r.res<1e-5).length;
  // shuffled controls
  const s1=J.filter(r=>r.shufNcand>=1).length,s1u=J.filter(r=>r.shufNcand===1);
  const sTag=s1u.filter(r=>best[r.tag]===r.shufTypes[0]).length;
  const sRes=s1u.filter(r=>r.shufRes!==null&&r.shufRes!==undefined);
  const sResOK=sRes.filter(r=>r.shufRes<1e-5).length;
  const sh=[0,1,2].map(k=>J.filter(r=>r.ctrlShift[k]>=1).length);
  console.log(g,JSON.stringify({faces:R.length,withIdBlock:id.length,noNativeModel:noNative,joined0:c0,joined1:c1,joinedMulti:cm,tagEqType:tagOK,onUnique:u.length,geomChecked:res.length,geomWithin1e5:resOK,
   ctrlShuffle:{anyCand:s1,unique:s1u.length,tagEq:sTag,geomChecked:sRes.length,geomOK:sResOK},ctrlIdPlus123Hit:sh}));
}
// files
const byF={};for(const r of rows)if(r.lay==='C'){const b=byF[r.file]=byF[r.file]||{n:0,nat:r.nat,err:r.err,j1:0,j0:0,jm:0};b.n++;if(r.ncand===1)b.j1++;else if(r.ncand===0)b.j0++;else if(r.ncand>1)b.jm++;}
console.log(JSON.stringify(byF,null,0).replace(/\},/g,'},\n'));
