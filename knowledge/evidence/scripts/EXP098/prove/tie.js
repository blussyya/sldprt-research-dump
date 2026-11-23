// STEP tie check: export each config of tied multi-config files, normalise timestamp, compare; also count ADVANCED_FACE
const fs=require('fs'),cp=require('child_process'),crypto=require('crypto');
const R=JSON.parse(fs.readFileSync(__dirname+'/results-multi.json'));
const out={};
for(const [f,x] of Object.entries(R)){
  const fit=Object.entries(x.configs).filter(([n,o])=>o.box&&o.fitNative&&o.gap<=1e-8).map(([n])=>n);
  if(fit.length<2)continue;
  const rec={};
  for(const n of fit){
    const p='/tmp/claude-0/step_'+crypto.createHash('md5').update(f+n).digest('hex')+'.stp';
    const r=cp.spawnSync('node',[__dirname+'/one.js',f,n,p],{timeout:600000,encoding:'utf8'});
    if(r.status!==0){rec[n]={error:r.stderr.slice(-200)};continue;}
    let t=fs.readFileSync(p,'utf8');
    const ts=(t.match(/FILE_NAME\([^;]*;/)||[''])[0];
    t=t.replace(/(FILE_NAME\('[^']*',\s*)'[^']*'/,"$1'TS'").replace(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[^']*/g,'TS');
    rec[n]={faces:(t.match(/ADVANCED_FACE\(/g)||[]).length,hash:crypto.createHash('md5').update(t).digest('hex'),len:t.length,disp:x.display.faces};
  }
  out[f.split('/').slice(-1)[0]]=rec;
  console.log(f.split('/').pop(),JSON.stringify(rec));
}
fs.writeFileSync(__dirname+'/results-tie.json',JSON.stringify(out,null,1));
