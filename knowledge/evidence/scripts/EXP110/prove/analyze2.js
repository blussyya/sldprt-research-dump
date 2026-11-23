// EXP110 prove, final analysis of the five parts. usage: node analyze2.js out_controls.jsonl out_merged.jsonl
// Sets: ALL faces with a 132 B bounds record; L = faces in files with DisplayLists version >= 5000 (layout of +92..+131 as claimed);
// typed = faces with a native surface type from the join (or a display tag).
const fs=require('fs');
const ver=JSON.parse(fs.readFileSync(__dirname+'/file_versions.json'));
const label=process.argv[2];let rows=[];for(const f of process.argv.slice(3))rows=rows.concat(fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(JSON.parse));
const err=rows.filter(r=>r.error);const ALL=rows.filter(r=>r.u92!==undefined);
const FLAT=1e-6; // 1-cos(spread) < 1e-6 = 0.08 deg. 1e-10 was tried first: it calls 1060 native planes non-flat (their stored vertex normals differ by ~0.01 deg, e.g. the chamfer plane in C09), so it is not a plane test.
const flat=r=>r.estMinCos!==undefined&&1-r.estMinCos<FLAT;
// plane for part 3/4: native type, else display tag, else u92==1 (part 1 shows u92 is exact on the 13383 typed faces)
const isPlane=r=>r.type?r.type==='plane':r.tag!=null?r.tag===4001:r.u92===1;
const g=(a,k)=>a.reduce((m,r)=>{const x=k(r);m[x]=(m[x]||0)+1;return m;},{});
const mx=(a,f)=>a.length?a.reduce((m,r)=>Math.max(m,f(r)),-Infinity):NaN,mn=(a,f)=>a.length?a.reduce((m,r)=>Math.min(m,f(r)),Infinity):NaN;
const deg=c=>Math.acos(Math.max(-1,Math.min(1,c)))*180/Math.PI;
const short=f=>f.replace(/.*sldprt-research-dump\/test files /,'');
console.log('#',label,'| errors',err.length,'| faces with 132 B bounds',ALL.length,'| files',new Set(ALL.map(r=>r.file)).size);
const L=ALL.filter(r=>ver[r.file]>=5000),OLDV=ALL.filter(r=>ver[r.file]<5000);
console.log('faces at DisplayLists version >=5000:',L.length,' version <5000 (3800, 4100):',OLDV.length,'files',[...new Set(OLDV.map(r=>short(r.file)))]);
// ---------- part 1
console.log('\n=== PART 1: u92==1 exactly on planes. Bar: 0 violations.');
const typed=L.filter(r=>r.type);
const v1=typed.filter(r=>(r.type==='plane')!==(r.u92===1));
console.log('faces typed by native join:',typed.length,'(planes',typed.filter(r=>r.type==='plane').length,') violations',v1.length);
const tg=L.filter(r=>!r.type&&r.tag!=null);const v1b=tg.filter(r=>(r.tag===4001)!==(r.u92===1));
console.log('typed by display tag only:',tg.length,'violations',v1b.length);
const un=L.filter(r=>r.tag==null);
console.log('no tag, no join (type unknown), planarity taken from the display normals:',un.length,JSON.stringify(g(un,r=>'flat='+flat(r)+' u92='+(r.u92<2?r.u92:'other'))));
const ctl=typed.filter(r=>r.estMinCos!==undefined);console.log('CONTROL of the flatness test: normals flat <=> native plane agree on',ctl.filter(r=>flat(r)===(r.type==='plane')).length,'of',ctl.length);
console.log('all version>=5000 faces: u92 values',JSON.stringify(g(L,r=>r.u92<2?r.u92:'other')));
// ---------- part 2
console.log('\n=== PART 2: u128==1 on every record. Bar: 0 faces with another value.');
console.log('u128 by DisplayLists version (faces: u128=1 / u128=0 / other):');
const byV={};ALL.forEach(r=>{const v=ver[r.file];const o=byV[v]=byV[v]||{files:new Set(),faces:0,one:0,zero:0,other:0};o.files.add(r.file);o.faces++;if(r.u128===1)o.one++;else if(r.u128===0)o.zero++;else o.other++;});
for(const v of Object.keys(byV).sort((a,b)=>a-b)){const o=byV[v];console.log('  v'+v,'files',o.files.size,'faces',o.faces,'u128=1',o.one,'u128=0',o.zero,'other',o.other);}
const nonOne=ALL.filter(r=>r.u128!==1);console.log('faces with u128!=1:',nonOne.length,'of',ALL.length,'in files',new Set(nonOne.map(r=>r.file)).size);
const L2=L.filter(r=>ver[r.file]<18000);console.log('restricted to version 5000..17000:',L2.length,'faces, u128!=1:',L2.filter(r=>r.u128!==1).length);
// ---------- part 3
console.log('\n=== PART 3: cone fields when u104==1 && u108==1');
const C=L.filter(r=>r.u104===1&&r.u108===1);
console.log('faces with both flags =1:',C.length,'in',new Set(C.map(r=>r.file)).size,'files; native types',JSON.stringify(g(C,r=>r.type||('tag:'+r.tag))));
console.log('planes among them (by normals flat):',C.filter(flat).length,'(by isPlane):',C.filter(isPlane).length,' (by native type):',C.filter(r=>r.type==='plane').length);
const fin=C.filter(r=>Number.isFinite(r.s)&&r.v.every(Number.isFinite));console.log('non-finite float tails:',C.length-fin.length);
console.log('3a |v|: max | |v|-1 | =',mx(fin,r=>Math.abs(r.vNorm-1)).toExponential(2),' bar 2e-6 (float32); over bar:',fin.filter(r=>Math.abs(r.vNorm-1)>2e-6).length);
console.log('3b s range: min',mn(fin,r=>r.s),'max',mx(fin,r=>r.s),' 1/sqrt2=',Math.SQRT1_2,'; below 1/sqrt2 by >1e-6:',fin.filter(r=>r.s<Math.SQRT1_2-1e-6).length,'; above 1+1e-6:',fin.filter(r=>r.s>1+1e-6).length);
const E=fin.filter(r=>r.minCosStoredV!==undefined);
const gap=r=>r.s-r.minCosStoredV;
console.log('3c "s never below cos(max angle(n_i,v))": s - minCos: min',mn(E,gap).toExponential(2),' bar >= -2e-6; violations',E.filter(r=>gap(r)<-2e-6).length,'of',E.length);
const cont=E.filter(r=>gap(r)>2e-6);
console.log('3d "cone holds the normals" needs s <= minCos (+2e-6): violations',cont.length,'of',E.length,'; worst: normals reach',mx(E,r=>deg(r.minCosStoredV)-deg(r.s)).toFixed(2),'deg beyond the stored half-angle; exactly tight (|s-minCos|<=2e-6):',E.filter(r=>Math.abs(gap(r))<=2e-6).length);
console.log('   median stored half-angle',(()=>{const a=E.map(r=>deg(r.s)).sort((x,y)=>x-y);return a[a.length>>1].toFixed(2)})(),'deg, median normal reach',(()=>{const a=E.map(r=>deg(r.minCosStoredV)).sort((x,y)=>x-y);return a[a.length>>1].toFixed(2)})(),'deg');
const A=fin.filter(r=>r.anaMinCosStoredV!==undefined);
console.log('3e direction (analytic outward normal of native surface x face sense, at each display vertex):');
console.log('   display normals vs analytic: min dot',mn(A,r=>r.anaAgreeMin).toFixed(6),'faces under 0.999:',A.filter(r=>r.anaAgreeMin<0.999).length,'of',A.length);
const A2=A.filter(r=>r.anaAgreeMin>=0.999);
for(const [nm,f] of [['same-sense',r=>r.same],['reversed',r=>!r.same]]){const s=A2.filter(f);console.log('   ',nm,'faces',s.length,'min over faces of min_i cos(v,n_i) =',mn(s,r=>r.anaMinCosStoredV).toFixed(4),'(>0 means v on the outward side; <0 on any vertex:',s.filter(r=>r.anaMinCosStoredV<=0).length+')');}
const byT={};A2.forEach(r=>{const k=r.type+(r.same?'':'-rev');(byT[k]=byT[k]||[]).push(r.anaMinCosStoredV);});for(const k in byT)console.log('     ',k,'n',byT[k].length,'min',Math.min(...byT[k]).toFixed(4));
console.log('   analytic normals, s - cos(maxAngle(n,v)): min',mn(A2,r=>r.s-r.anaMinCosStoredV).toExponential(2),' violations of s>=cos (<-1e-4):',A2.filter(r=>r.s-r.anaMinCosStoredV<-1e-4).length);
console.log('   control for the sign test: -v would be on the wrong side on',A2.filter(r=>-r.anaMinCosStoredV>0).length,'?? (faces where min cos<0 means v fails)');
console.log('   |cos(v, enclosing-cone axis of display normals)|: see estV; ');
const axis=E.filter(r=>r.estV);const dd=r=>{const u=r.v,w=r.estV;const l=Math.hypot(...u);return (u[0]*w[0]+u[1]*w[1]+u[2]*w[2])/l;};
console.log('   angle between stored v and the minimal enclosing axis of the display normals (deg): median',(()=>{const a=axis.map(r=>deg(dd(r))).sort((x,y)=>x-y);return a[a.length>>1].toFixed(3)})(),' max',mx(axis,r=>deg(dd(r))).toFixed(2));
// non-cone combos
console.log('flag combos (u104,u108) at version>=5000, planes vs not:',JSON.stringify(g(L,r=>(flat(r)?'plane':'nonplane')+' u104='+(r.u104<2?r.u104:'other')+' u108='+(r.u108<2?r.u108:'other'))));
// ---------- part 4
console.log('\n=== PART 4: per-file switch');
const byFile={};L.forEach(r=>(byFile[r.file]=byFile[r.file]||[]).push(r));
const half=r=>deg(r.estMinCos);const has=r=>r.u104===1&&r.u108===1;
const out=[];
for(const [f,a] of Object.entries(byFile)){
  const np=a.filter(r=>!isPlane(r)&&r.estMinCos!==undefined);
  const c45=np.filter(r=>half(r)<45-1),c40=np.filter(r=>half(r)<40),c35=np.filter(r=>half(r)<35);
  const w=np.filter(has);
  const st=w.length===0?(c40.length?'none':'n/a'):(c40.every(has)?(c40.length?'all':'cone-only-above-40'):'MIXED');
  out.push({file:short(f),ver:ver[f],faces:a.length,nonplanar:np.length,withCone:w.length,cand_lt40:c40.length,cand_lt40_with:c40.filter(has).length,cand_lt44:c45.length,cand_lt44_with:c45.filter(has).length,planesWithCone:a.filter(r=>isPlane(r)&&has(r)).length,status:st});
}
console.log('files',out.length,'status:',JSON.stringify(g(out,r=>r.status)));
console.log('planes with a cone (flat normals and both flags 1):',out.reduce((s,r)=>s+r.planesWithCone,0));
console.log('MIXED files:');out.filter(r=>r.status==='MIXED').forEach(r=>console.log(' ',JSON.stringify(r)));
console.log('cone files by DisplayLists version:',JSON.stringify(g(out.filter(r=>r.withCone),r=>'v'+r.ver)),' no-cone files with candidates (<40 deg) by version:',JSON.stringify(g(out.filter(r=>r.status==='none'),r=>'v'+r.ver)));
console.log('files with cones whose cone faces are all above... faces with cone but est half-angle >=45 deg:',L.filter(r=>has(r)&&!isPlane(r)&&half(r)>=45).length,' >=46:',L.filter(r=>has(r)&&!isPlane(r)&&half(r)>=46).length,' max est half-angle among cone faces',mx(L.filter(r=>has(r)&&!isPlane(r)),half).toFixed(2));
const stored=C.filter(r=>r.s!==undefined);console.log('stored half-angle (acos s) of cone faces: max',mx(stored,r=>deg(r.s)).toFixed(3),'deg  (bar: 45.0 = acos(1/sqrt2) => ',deg(Math.SQRT1_2).toFixed(3)+')');
// candidates at each threshold, cone present?
for(const T of [20,30,40,44]){const c=L.filter(r=>!isPlane(r)&&r.estMinCos!==undefined&&half(r)<T&&byFile[r.file].some(has));console.log('  in files that have cones: nonplanar faces with est half-angle <'+T+':',c.length,'with cone',c.filter(has).length,'without',c.filter(r=>!has(r)).length);}
const miss=L.filter(r=>!isPlane(r)&&r.estMinCos!==undefined&&half(r)<44&&byFile[r.file].some(has)&&!has(r));miss.slice(0,6).forEach(r=>console.log('    cone-file face without cone:',short(r.file),'#'+r.i,r.type||r.tag,'est',half(r).toFixed(1),'u104',r.u104,'u108',r.u108));
fs.writeFileSync(__dirname+'/part4_per_file_'+label+'.json',JSON.stringify(out,null,1));
