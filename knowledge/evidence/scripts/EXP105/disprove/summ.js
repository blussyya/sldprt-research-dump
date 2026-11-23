const fs=require('fs');const rows=fs.readFileSync(process.argv[2]||'corpus.jsonl','utf8').trim().split('\n').map(JSON.parse);
const ok=rows.filter(r=>!r.error),err=rows.filter(r=>r.error);
const T={};const add=(k,v)=>T[k]=(T[k]||0)+v;
let withFaces=0,withOff=0,withOffMore=0;const lines=[];
for(const r of ok){if(!r.faces)continue;withFaces++;for(const k of ['verts','off','offB','offI','offShared','offUnshared','offChordAdj','offChordAnchor','offNoChord','offNoGraph','offOnOther','ctrlBoundaryOn','ctrlBoundaryOnChord','shiftedOff','shiftedOffChord'])add(k,r[k]);
 r.hist.forEach((h,i)=>add('h'+i,h));if(r.off){withOff++;}
 lines.push([r.file.replace(/.*\//,'').slice(0,40),r.faces,r.verts,r.off,r.offI,r.offUnshared,r.offNoChord+r.offNoGraph,r.maxOff.toExponential(1),r.maxCoord.toFixed(3),r.hist.join('/')].join('\t'));}
console.log('files',rows.length,'errors',err.length,'withCylConeFaces',withFaces,'withOffVertices',withOff);
console.log(JSON.stringify(T));
console.log('file\tfaces\tverts\toff\toffInterior\toffUnshared\tnotOnChord\tmaxOff\tmaxCoord\thist(<=1e-9/1e-8/1e-7/1e-6/1e-5/>)');
console.log(lines.filter(l=>l.split('\t')[3]>0).join('\n'));
const e={};err.forEach(r=>e[r.error]=(e[r.error]||0)+1);console.log('errors',JSON.stringify(e));
