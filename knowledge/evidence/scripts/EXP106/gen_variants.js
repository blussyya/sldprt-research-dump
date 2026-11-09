// Writes select variants with absolute requires so they load from this folder.
// HEAD = live conv-dev 705b69b; OLD = 517476c; FULL = HEAD with every vertex and every B-rep surface checked.
const fs=require('fs');
const dir='/home/user/dump-validation/knowledge/evidence/scripts/EXP106';
const head=fs.readFileSync('/home/user/conv-dev/src/parasolid/select.js','utf8');
const old=fs.readFileSync(dir+'/select_517476c.js','utf8');
const abs=s=>s.replace(/require\('\.\.\//g,"require('/home/user/conv-dev/src/");
const constLine='const PER_FACE=8,NEAR=3,PREFILTER=1e-6;';
if(!head.includes(constLine))throw Error('constant line changed');
const full=head.replace(constLine,'const PER_FACE=1e9,NEAR=1e9,PREFILTER=Infinity;');
fs.writeFileSync(dir+'/variants/select_HEAD.js',abs(head));
fs.writeFileSync(dir+'/variants/select_OLD_517476c.js',abs(old));
fs.writeFileSync(dir+'/variants/select_FULL.js',abs(full));
console.log('ok', head.length, old.length, full.length);
