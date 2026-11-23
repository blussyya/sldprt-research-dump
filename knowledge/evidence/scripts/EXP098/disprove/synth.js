// synth.js: synthetic multi-config sets built from controlled single-config files.
// Display from one file, candidates = the partitions of several files. Tests what the rule can tell apart.
// Controls: cube10 vs cube20 (different box) must be rejected; the display's own partition must fit.
const fs=require('fs'),zlib=require('zlib'),crypto=require('crypto');
const R='/home/user/solidworks-converters/src/';
const P=require(R+'parasolid/partition.js'),S=require(R+'parasolid/select.js'),V=require(R+'brep/volume'),native=require(R+'brep/native'),Pr=require(R+'brep/procedural'),step=require(R+'step/export');
const iR=b=>zlib.inflateRawSync(b),iZ=b=>zlib.inflateSync(b),C={inflateRaw:iR,inflate:iZ};
const B='/home/user/sldprt-research-dump/test files original/controlled/';
const names=['C00_cube_10mm','C01_cube_20mm','C03_cube_fillet_1mm','C04_cube_hole_5mm','C05_cube_hole_3mm','C06_cube_hole_moved','C09_cube_chamfer_1mm','C11_cube_hole_4mm'];
const cand=names.map(n=>{const raw=fs.readFileSync(B+n+'/model.SLDPRT');const all=P.streams(raw);const pn=Object.keys(all).find(k=>/Config-\d+-Partition$/.test(k));
  const a=P.assemble(all,pn,C,{});const m=Pr.resolve(native.build(a.parsed));const vol=Math.abs(V.volume(m).volume);
  const t=step.toSTEP(a.parsed,{}).text;return {n,name:n,raw,parsed:a.parsed,vol,hash:crypto.createHash('sha1').update(t.slice(t.indexOf('DATA;'))).digest('hex').slice(0,10)};});
for(const disp of ['C04_cube_hole_5mm','C03_cube_fillet_1mm','C00_cube_10mm']){
  const d=cand.find(c=>c.n===disp);const r=S.choose(d.raw,cand,iR,iZ);
  console.log('\nDISPLAY of',disp,'-> rule picks',r.name,'matches',r.matches.join(','));
  for(const row of r.rows)console.log('  ',row.name.padEnd(26),'faces',row.faces,'gap',row.gap===undefined?'-':row.gap.toExponential(1),'vol',(cand.find(c=>c.n===row.name).vol*1e9).toFixed(1),'mm3 step',cand.find(c=>c.n===row.name).hash);
}
