const S=require(require('path').join(__dirname,'../../../../../solidworks-converters/src')),fs=require('fs'),path=require('path');
const dir=process.argv[2],idx=Object.fromEntries(fs.readFileSync(process.argv[3],'utf8').trim().split('\n').map(l=>l.split('\t')).map(([f,r,p])=>[f,[r,p]]));
const lic=Object.fromEntries(fs.readFileSync(process.argv[4],'utf8').trim().split('\n').map(l=>l.split('\t')));
for(const f of fs.readdirSync(dir)){const p=path.join(dir,f);if(fs.statSync(p).size<20000)continue;let r;
 try{r=S.info(p);}catch(e){console.log(['ERR','',f,idx[f]&&idx[f][0],e.message].join('\t'));continue;}
 const s=r.saved||{};console.log([s.version||'?',s.release||r.container,f,idx[f]&&idx[f][0],lic[idx[f]&&idx[f][0]]||'?',r.display&&r.display.faces,r.brep?r.brep.census.FACE:'nobrep'].join('\t'));}
