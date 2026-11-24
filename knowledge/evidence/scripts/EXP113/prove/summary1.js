'use strict';
/* Reads out/sweep_all.json and prints the Claim 1 numbers. usage: node summary1.js out/sweep_all.json */
const r=JSON.parse(require('fs').readFileSync(process.argv[2]));
const grp=n=>/^tolerant/.test(n)?'tolerant':/circle/.test(n)?'circle':/ellipse/.test(n)?'ellipse':/bspline/.test(n)?'bspline':/line/.test(n)?'line':/intersection/.test(n)?'intersection':n;
const e=x=>x===undefined||x===null?'-':x.toExponential(2);
const mm=a=>a.length?e(Math.min(...a))+'..'+e(Math.max(...a)):'-';
// coverage
let c4002=0,c4003=0,joined=0,unj=0;const how={};
for(const f of Object.values(r.coverage)){c4002+=f.tag4002;c4003+=f.tag4003;joined+=f.joined;unj+=f.unjoined;for(const k in f.joinHow)how[k]=(how[k]||0)+f.joinHow[k];}
console.log('files read',Object.keys(r.coverage).length,'skipped',r.skipped.length,'(',r.skipped.map(x=>x[0].slice(0,12)).join('; '),')');
console.log('display faces tagged cylinder',c4002,'cone',c4003,'joined to a native cylinder/cone face',joined,'not joined',unj,JSON.stringify(how));
const T=Object.values(r.files).reduce((a,f)=>({faces:a.faces+f.faces,verts:a.verts+f.verts,flagged:a.flagged+f.flagged,dup:a.dup+(f.dupCopies||0)}),{faces:0,verts:0,flagged:0,dup:0});
console.log('faces checked',T.faces,'vertex copies',T.verts,'of which repeated copies of a position',T.dup,'distinct flagged positions (>1e-7 m off surface)',T.flagged);
// classes
const cls={};
const key=f=>{
  if(f.kind==='corner')return 'corner';if(f.kind==='interior')return 'interior (not on any boundary cycle)';if(f.kind==='nocycle')return 'nocycle';
  if(f.isChord)return 'chord (<=2 ulp)';
  if(f.dChord<=1e-8)return 'near-chord (2 ulp < d <= 1e-8)';
  const best=Math.min(f.dCurve===null?Infinity:f.dCurve,f.dFin===null||f.dFin===undefined?Infinity:f.dFin);
  if(best<=f.Q+1e-10)return 'off-chord, on a curve (edge curve or a fin curve, <= 1 ulp)';
  return 'off-chord, NOT on a curve';};
for(const f of r.flagged){const k=f.surf+' / '+key(f);(cls[k]=cls[k]||[]).push(f);}
for(const k of Object.keys(cls).sort()){const a=cls[k];console.log(k.padEnd(78),String(a.length).padStart(6),'|dSurf|',mm(a.map(f=>Math.abs(f.dSurf))),a[0].dChord!==undefined?'dChord '+mm(a.map(f=>f.dChord)):'');}
// chord points: curve distance vs surface distance, by edge-curve group
console.log('\nstrict chord points: distance to the edge curve against distance to the surface');
const byG={};
const noCurve=r.flagged.filter(f=>f.kind==='mid'&&f.curves.filter(c=>!c.extra).length===0);
console.log('flagged boundary vertices whose edge id matches no native edge of the face (no curve to test):',noCurve.length,'by file',JSON.stringify(noCurve.reduce((a,f)=>(a[f.file.slice(0,8)]=(a[f.file.slice(0,8)]||0)+1,a),{})),'edge ids',[...new Set(noCurve.map(f=>f.edgeId))].slice(0,10).join(','));
for(const f of r.flagged.filter(f=>f.kind==='mid'&&f.isChord&&f.curves.filter(c=>!c.extra).length)){const g=f.surf+' '+grp(f.curves.find(c=>!c.extra).name);(byG[g]=byG[g]||[]).push(f);}
for(const g of Object.keys(byG).sort()){const a=byG[g],ok=a.filter(f=>f.dCurve!==null),ratio=ok.map(f=>f.dCurve/Math.abs(f.dSurf));
  const onCurve=ok.filter(f=>f.dCurve<=f.Q+1e-10).length;
  console.log(g.padEnd(24),String(a.length).padStart(6),'curve evaluated',ok.length,'dCurve/dSurf',ratio.length?Math.min(...ratio).toFixed(3)+'..'+Math.max(...ratio).toFixed(3):'-','on curve (<=1 ulp)',onCurve,'dChord max',e(Math.max(...a.map(f=>f.dChord))),'dChord/Q max',Math.max(...a.map(f=>f.dChord/f.Q)).toFixed(2));}
// controls
console.log('\ncontrol 1: boundary vertices on the surface (|dSurf| <= 1 ulp) against their edge curve');
const cr=r.ctrlRows.filter(x=>Math.abs(x[1])<=x[3]),cg={};
for(const x of cr){const g=grp(x[0].split('|')[0]);(cg[g]=cg[g]||[]).push(x);}
for(const g in cg){const a=cg[g];console.log(' ',g.padEnd(12),a.length,'max dCurve',e(Math.max(...a.map(x=>x[2]))),'max dCurve/ulp',Math.max(...a.map(x=>x[2]/x[3])).toFixed(2),'over (1 ulp+1e-10):',a.filter(x=>x[2]>x[3]+1e-10).length);}
console.log('  all',cr.length,'over bar',cr.filter(x=>x[2]>x[3]+1e-10).length,'(of',r.ctrlRows.length,'on-curve-evaluable boundary vertices with |dSurf|<=1e-7)');
console.log('control 2/3 (moved vertex; synthetic chord point):',JSON.stringify(r.control.moved),JSON.stringify(r.control.synthChord));

// degenerate chords: a neighbour at (almost) the vertex itself makes the chord test empty
console.log('\nchord test sanity: how close is the nearer neighbour, and how long is the chord (flagged boundary vertices)');
const mids=r.flagged.filter(f=>f.kind==='mid');
const deg=mids.filter(f=>Math.min(f.dVA,f.dVB)<=4*f.Q);
console.log(' flagged boundary vertices',mids.length,'with a neighbour within 4 ulp of the vertex (empty test):',deg.length,'of which counted as strict chord',deg.filter(f=>f.isChord).length);
console.log(' neighbour distance (nearer one) over the strict chords: min',e(Math.min(...mids.filter(f=>f.isChord).map(f=>Math.min(f.dVA,f.dVB)))),' chord length min',e(Math.min(...mids.filter(f=>f.isChord).map(f=>f.lenAB))));
const nd=mids.filter(f=>f.isChord&&Math.min(f.dVA,f.dVB)>4*f.Q);console.log(' strict chords with both neighbours farther than 4 ulp:',nd.length);
// gaps: the dChord distribution has a hole between the chord group and the off-chord group
const all=mids.map(f=>f.dChord).sort((a,b)=>a-b);const nonDeg=mids.filter(f=>Math.min(f.dVA,f.dVB)>4*f.Q).map(f=>f.dChord).sort((a,b)=>a-b);
console.log(' dChord of all non-degenerate flagged boundary vertices: counts <=2e-9',nonDeg.filter(x=>x<=2e-9).length,' 2e-9..5e-8',nonDeg.filter(x=>x>2e-9&&x<=5e-8).length,' 5e-8..1e-7',nonDeg.filter(x=>x>5e-8&&x<=1e-7).length,' >1e-7',nonDeg.filter(x=>x>1e-7).length);
// the exceptions in detail
console.log('\nexceptions (not strict chord) in detail, distinct by file+position:');
const seen=new Set();
for(const f of r.flagged.filter(f=>!(f.kind==='mid'&&f.isChord)).sort((a,b)=>a.file<b.file?-1:1)){
  const k=f.file+f.pos+f.kind;if(f.pos&&seen.has(k))continue;seen.add(k);
  const best=f.curves?f.curves.concat().filter(c=>c.d!==null).sort((a,b)=>a.d-b.d)[0]:null;
  console.log(' ',f.file.slice(0,8),f.surf,'face',f.face,f.kind,'dSurf',e(f.dSurf),f.dChord!==undefined?'dChord '+e(f.dChord):'','Q',e(f.Q),best?'nearest curve '+best.name.replace('tolerant-spcurve','tolSp')+(best.extra?'(fin of a non-tolerant edge)':'')+' d='+e(best.d)+' edge tol '+e(best.tol):'',f.nativeVertex?'native vertex d '+e(f.nativeVertex.d)+' tol '+e(f.nativeVertex.tol):'');}

console.log('\ncontrolled models (SW2022 folder):');
for(const k of Object.keys(r.files).filter(k=>/^C\d\d_/.test(k)&&r.files[k].faces)){const rows=r.flagged.filter(f=>f.file===k);console.log(' ',k,'cyl/cone faces',r.files[k].faces,'vertex copies',r.files[k].verts,'flagged',r.files[k].flagged,'strict chord',rows.filter(f=>f.kind==='mid'&&f.isChord).length,'other',rows.filter(f=>!(f.kind==='mid'&&f.isChord)).length);}
