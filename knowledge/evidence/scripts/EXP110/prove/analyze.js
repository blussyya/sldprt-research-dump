// EXP110 prove: tests the 5 parts on the jsonl from extract.js. usage: node analyze.js out.jsonl [more.jsonl]
const fs=require('fs');
let rows=[];for(const f of process.argv.slice(2))rows=rows.concat(fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(JSON.parse));
const infos=rows.filter(r=>r.fileInfo),ole=rows.filter(r=>r.ole),errs=rows.filter(r=>r.error),nob=rows.filter(r=>r.nobounds);
const ALL=rows.filter(r=>r.u92!==undefined);
// Faces with no id/tag block (tag null) are kept apart: their bounds record is still found by the reader but nothing says what surface they are.
const F=ALL.filter(r=>r.tag!=null),NT=ALL.filter(r=>r.tag==null);
console.log('faces with bounds record',ALL.length,'with id/tag block',F.length,'without',NT.length);
console.log('NO-TAG faces (excluded below): u92',JSON.stringify(NT.reduce((a,r)=>(a[r.u92<2?r.u92:'other']=(a[r.u92<2?r.u92:'other']||0)+1,a),{})),'u128',JSON.stringify(NT.reduce((a,r)=>(a[r.u128<2?r.u128:'other']=(a[r.u128<2?r.u128:'other']||0)+1,a),{})),'metaErr',JSON.stringify(NT.reduce((a,r)=>{const k=(r.metaErr||'none').replace(/\d+/g,'N');a[k]=(a[k]||0)+1;return a;},{})));
console.log('files modern',infos.length,'ole skipped',ole.length,'errors',errs.length,'brep-join-failed files',infos.filter(i=>i.berr).length,'faces with bounds',ALL.length,'faces without 132B bounds',nob.length);
if(errs.length)console.log(' errors:',errs.map(e=>e.file.split('/').slice(-2).join('/')+': '+e.error).slice(0,5));
const TAGT={4001:'plane',4002:'cylinder',4003:'cone',4004:'sphere',4005:'torus',4006:'bspline',4007:'blend',4009:'swept',4010:'spun'};
const typ=r=>r.type||('tag:'+(TAGT[r.tag]||r.tag));
console.log('join how:',JSON.stringify(F.reduce((a,r)=>(a[r.how]=(a[r.how]||0)+1,a),{})));
// ---- part 1
console.log('\n== PART 1 u92 vs plane');
const t1={};for(const r of F){const k=typ(r)+' u92='+(r.u92<2?r.u92:'other');t1[k]=(t1[k]||0)+1;}console.log(t1);
const J=F.filter(r=>r.type);
const bad1=J.filter(r=>(r.type==='plane')!==(r.u92===1));console.log('joined faces',J.length,'violations (native type)',bad1.length);
const bad1b=F.filter(r=>(r.tag===4001)!==(r.u92===1));console.log('all tagged faces, violations by display tag',bad1b.length,'of',F.length);
const ex=a=>a.slice(0,8).map(r=>r.file.split('/').slice(-2).join('/')+' #'+r.i+' '+typ(r)+' u92='+r.u92);
if(bad1.length)console.log(ex(bad1));
const u92other={};for(const r of F)u92other[r.u92]=(u92other[r.u92]||0)+1;console.log('u92 values (tagged faces)',u92other);
// ---- part 2
console.log('\n== PART 2 u128');
const t2={};F.forEach(r=>{const k=r.u128<2?r.u128:'other';t2[k]=(t2[k]||0)+1;});console.log('tagged faces',t2);const z=F.filter(r=>r.u128!==1);console.log('tagged faces with u128!=1:',z.length,JSON.stringify(z.slice(0,6).map(r=>[r.file.split('/').slice(-1)[0],r.i,typ(r),r.u128,r.noEdge])));
// ---- part 3
console.log('\n== PART 3');
const C=F.filter(r=>r.u104===1&&r.u108===1);
const cmb={};F.forEach(r=>{const k='u104='+(r.u104<2?r.u104:'other')+',u108='+(r.u108<2?r.u108:'other')+' '+(r.type==='plane'||r.tag===4001?'plane':'nonplane');cmb[k]=(cmb[k]||0)+1;});console.log('u104/u108 combos',cmb);
console.log('faces with both=1:',C.length,'types',JSON.stringify(C.reduce((a,r)=>(a[typ(r)]=(a[typ(r)]||0)+1,a),{})));
const fin=C.filter(r=>Number.isFinite(r.s)&&r.v.every(Number.isFinite));console.log('finite floats',fin.length,'nonfinite',C.length-fin.length);
const nonf=C.filter(r=>!(Number.isFinite(r.s)&&r.v.every(Number.isFinite)));if(nonf.length)console.log(ex(nonf));
const mx=(a,f)=>a.reduce((m,r)=>Math.max(m,f(r)),-Infinity),mnv=(a,f)=>a.reduce((m,r)=>Math.min(m,f(r)),Infinity);
const D=fin;
console.log('|v|-1 max dev',mx(D,r=>Math.abs(r.vNorm-1)),'bar 2e-6; over:',D.filter(r=>Math.abs(r.vNorm-1)>2e-6).length);
console.log('s min',mnv(D,r=>r.s),'1/sqrt2=',Math.SQRT1_2,' below 1/sqrt2-1e-6:',D.filter(r=>r.s<Math.SQRT1_2-1e-6).length,'; s>1+1e-6:',D.filter(r=>r.s>1+1e-6).length);
const E=D.filter(r=>r.minCosStoredV!==undefined);
// containment: need minCos(display normals, v) >= s - tol
const gap=r=>r.s-r.minCosStoredV; // >0 means s above cos of largest normal angle? s>=minCos required => gap>=0 means ok? see below
// claim: s never lower than cos(max angle) => s >= minCos  => s-minCos >= -tol
console.log('display normals: s - cos(maxAngle(n,v)): min',mnv(E,gap),'(claim needs >= -2e-6) violations',E.filter(r=>gap(r)<-2e-6).length,'of',E.length);
const ang=r=>Math.acos(Math.max(-1,Math.min(1,r)))*180/Math.PI;
const cont=E.filter(r=>r.s>r.minCosStoredV+2e-6);console.log('CONTAINMENT (cone holds all display normals needs s <= cos(maxAngle)): violations',cont.length,'of',E.length,' worst excess (deg) stored half-angle narrower than normals reach:',mx(E,r=>ang(r.minCosStoredV)-ang(r.s)));
console.log('  tightness: s-minCos max',mx(E,gap),' faces where s-minCos<1e-5 (tight):',E.filter(r=>gap(r)<1e-5).length,' >1e-3:',E.filter(r=>gap(r)>1e-3).length);
const A=D.filter(r=>r.anaMinCosStoredV!==undefined);
const gapA=r=>r.s-r.anaMinCosStoredV;
console.log('analytic (native surface x sense) normals: s - cos(maxAngle(n,v)): min',mnv(A,gapA),'violations (<-1e-4)',A.filter(r=>gapA(r)<-1e-4).length,'of',A.length);
console.log('display normals vs analytic outward*sense: min dot',mnv(A,r=>r.anaAgreeMin),' faces below 0.999:',A.filter(r=>r.anaAgreeMin<0.999).length);
// direction/sense: v should be near the outward normals: min analytic cos >0 (cone in the right half) and per-face mean sign
console.log('direction: v . analytic outward normal, min over vertices, min over faces',mnv(A,r=>r.anaMinCosStoredV),' faces with a vertex having v.n<0:',A.filter(r=>r.anaMinCosStoredV<0).length);
console.log('  reversed faces with cone',A.filter(r=>r.same===false).length,' min',mnv(A.filter(r=>r.same===false),r=>r.anaMinCosStoredV),' same-sense faces',A.filter(r=>r.same).length,' min',mnv(A.filter(r=>r.same),r=>r.anaMinCosStoredV));
const byT={};A.forEach(r=>{(byT[r.type+(r.same?'':'-rev')]=byT[r.type+(r.same?'':'-rev')]||[]).push(r.anaMinCosStoredV);});for(const k in byT)console.log('  ',k,'n',byT[k].length,'min cos(v,n)',Math.min(...byT[k]).toFixed(5));
// does the sign matter: -v
console.log('  with -v instead: faces where -v fits the analytic normals (min cos>0):',A.filter(r=>r.anaEstMinCos!==undefined&&false).length);
console.log('s vs enclosing cone estimate (display normals): s - estMinCos min',mnv(E,r=>r.s-r.estMinCos),'max',mx(E,r=>r.s-r.estMinCos));
// ---- part 4
console.log('\n== PART 4 per-file switch');
const byFile={};for(const r of F){(byFile[r.file]=byFile[r.file]||[]).push(r);}
const rowsOut=[];let mixed=0,allhave=0,none=0,tot=0,planeWith=0,mixedNear=0;
const half=r=>Math.acos(Math.min(1,r.estMinCos))*180/Math.PI;
for(const [file,fs_] of Object.entries(byFile)){
  const np=fs_.filter(r=>r.u92!==1&&r.tag!==4001&&r.estMinCos!==undefined);
  const has=r=>r.u104===1&&r.u108===1;
  planeWith+=fs_.filter(r=>(r.tag===4001||r.type==='plane')&&has(r)).length;
  const cand=np.filter(r=>half(r)<45), candStrict=np.filter(r=>half(r)<40);
  const w=cand.filter(has).length,wStrict=candStrict.filter(has).length;
  const over=np.filter(r=>half(r)>=45&&has(r)).length, anyHas=np.filter(has).length;
  const status=anyHas===0?(cand.length?'none':'n/a-no-candidates'):(w===cand.length?'all':'MIXED');
  rowsOut.push({file:file.replace(/.*sldprt-research-dump\//,''),faces:fs_.length,nonplanar:np.length,cand45:cand.length,withCone:anyHas,cand45withCone:w,cand40:candStrict.length,cand40with:wStrict,over45with:over,status});
}
const st={};rowsOut.forEach(r=>st[r.status]=(st[r.status]||0)+1);console.log('file status (candidate = est. half-angle <45deg, from display normals):',st);
console.log('planes with cone fields (u104=u108=1):',planeWith);
console.log('MIXED files:');rowsOut.filter(r=>r.status==='MIXED').forEach(r=>console.log(' ',JSON.stringify(r)));
console.log('files with cone on some face and strict (<40deg) candidates without:');rowsOut.filter(r=>r.withCone&&r.cand40with<r.cand40).forEach(r=>console.log(' ',JSON.stringify(r)));
console.log('files with no cones but strict candidates (<40deg):',rowsOut.filter(r=>!r.withCone&&r.cand40>0).length,' files with cones:',rowsOut.filter(r=>r.withCone).length);
// histogram of half angle (stored s) for faces with cone, and estimated half angle for those without, nonplanar
const hist={};F.filter(r=>r.u92!==1&&r.estMinCos!==undefined).forEach(r=>{const h=half(r),b=Math.min(9,Math.floor(h/10))*10;const k=b+'-'+(b+10)+(r.u104===1&&r.u108===1?' cone':' none');hist[k]=(hist[k]||0)+1;});
console.log('half-angle histogram (est from display normals) by presence:',Object.fromEntries(Object.entries(hist).sort()));
const withAbove=F.filter(r=>r.u92!==1&&r.u104===1&&r.u108===1&&half(r)>=45);console.log('faces with cone but est half-angle>=45:',withAbove.length,withAbove.slice(0,5).map(r=>r.file.split('/').slice(-1)+' #'+r.i+' est='+half(r).toFixed(1)+' s='+Math.acos(r.s)*180/Math.PI));
fs.writeFileSync(__dirname+'/part4_per_file.json',JSON.stringify(rowsOut,null,1));
// ---- part 5
console.log('\n== PART 5 u100');
const uq=new Set(F.map(r=>r.u100));console.log('distinct values',uq.size,'of',F.length);
const per={};F.forEach(r=>{(per[r.file]=per[r.file]||[]).push(r.u100);});
let dupFiles=0;for(const k in per){if(new Set(per[k]).size<per[k].length)dupFiles++;}console.log('files with repeated u100 within file:',dupFiles,'of',Object.keys(per).length);
const bt={};F.forEach(r=>{const k=typ(r);(bt[k]=bt[k]||new Set()).add(r.u100);});for(const k in bt)console.log(' ',k,'distinct',bt[k].size);
console.log('u100 low 3 bits histogram',JSON.stringify([0,1,2,3,4,5,6,7].map(b=>F.filter(r=>(r.u100&7)===b).length)),' u100 ==0:',F.filter(r=>r.u100===0).length);

