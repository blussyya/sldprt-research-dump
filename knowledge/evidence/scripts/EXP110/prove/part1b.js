// EXP110 part 1/2 extension to faces with no id/tag block: planarity from the display normals themselves.
// plane <=> all vertex normals equal (estMinCos>=1-1e-9 means the enclosing cone has zero width, up to float32)
const fs=require('fs');const R=fs.readFileSync(process.argv[2],'utf8').split('\n').filter(Boolean).map(JSON.parse).filter(r=>r.u92!==undefined&&r.estMinCos!==undefined);
const flat=r=>r.estMinCos>=1-1e-6; // float32 normals: 1e-6 in cosine = 0.08 deg
const g={};R.forEach(r=>{const grp=r.tag!=null?'tagged':'no-tag';const k=grp+' flat='+flat(r)+' u92='+(r.u92<2?r.u92:'other');g[k]=(g[k]||0)+1;});
console.log(g);
// control for the flatness test: tagged faces: flat <=> native plane?
const T=R.filter(r=>r.type);console.log('tagged joined: flat vs native plane agree',T.filter(r=>flat(r)===(r.type==='plane')).length,'of',T.length,' disagree:',T.filter(r=>flat(r)!==(r.type==='plane')).slice(0,5).map(r=>r.file.split('/').pop()+'#'+r.i+' '+r.type+' estMinCos='+r.estMinCos));
