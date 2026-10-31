const rows=require('fs').readFileSync('corpus.out','utf8').trim().split('\n').map(JSON.parse);
console.log('rows',rows.length,'files',new Set(rows.map(r=>r.file)).size,'edges',rows.filter(r=>r.kind==='edge').length,'spines',rows.filter(r=>r.kind==='spine').length);
console.log('errors new/old',rows.filter(r=>r.en).length,rows.filter(r=>r.eo).length);
for(const r of rows.filter(r=>r.en!==r.eo))console.log('ERRDIFF',r.file,r.kind,r.id,r.en,'|',r.eo);
const rj=rows.filter(r=>r.nrej>0);console.log('rows with rejections',rj.length,'total rejected',rj.reduce((a,r)=>a+r.nrej,0),'total accepted',rows.reduce((a,r)=>a+r.nok,0));
for(const r of rj)console.log('REJ',r.file,r.kind,r.id,r.info,'nrej',r.nrej,'nok',r.nok,'errNew',r.errNew,'errOld',r.errOld,'devNO',r.devNO,'devON',r.devON,JSON.stringify(r.rej.slice(0,2).map(x=>({ra:+x.ra.toFixed(2),rb:+x.rb.toFixed(2),dga:x.dga,dgb:x.dgb,L:x.L,lat:x.lat}))));
// rows where new error >1e-8 or differs from old
const worse=rows.filter(r=>r.errNew!==undefined&&r.errOld!==undefined&&(r.errNew>r.errOld*1.0001+1e-12));console.log('rows with errNew>errOld',worse.length);for(const r of worse)console.log('WORSE',r.file,r.kind,r.id,r.info,r.errNew,r.errOld,r.nrej);
const big=rows.filter(r=>r.errNew>1e-8);console.log('rows with errNew>1e-8',big.length);for(const r of big.slice(0,20))console.log('BIG',r.file,r.kind,r.id,r.info,r.errNew,r.errOld,'nrej',r.nrej,'devNO',r.devNO,'devON',r.devON);
const dv=rows.filter(r=>Math.max(r.devNO||0,r.devON||0)>1e-9);console.log('rows where fits differ >1e-9',dv.length);for(const r of dv.slice(0,20))console.log('DIFF',r.file,r.kind,r.id,r.info,'devNO',r.devNO,'devON',r.devON,'errNew',r.errNew,'errOld',r.errOld,'nrej',r.nrej);
