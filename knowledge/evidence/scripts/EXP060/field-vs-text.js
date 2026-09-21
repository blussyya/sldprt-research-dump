const fs=require('fs'),path=require('path');
const E=require('/home/user/sldprt-research-dump/v0.4.9/exp058_schema_boundary.js');
const B='/home/user/sldprt-research-dump/test files new/SW2022';
const strip=b=>{const e=b.indexOf('**END_OF_HEADER');return e<0?b:b.subarray(b.indexOf('\n',e)+1);};
const log=fs.readFileSync(path.join(B,'BUILD_LOG.md'),'utf8');
const sw={};let cur=null,il=false;
for(const l of log.split(/\r?\n/)){
 const h=l.match(/^##\s+\S*?\/?([A-Z]\d\d_[A-Za-z0-9_]+)\s*$/);
 if(h){cur=h[1];sw[cur]=[];il=false;continue;} if(!cur)continue;
 if(/Individual face surface types/i.test(l)){il=true;continue;}
 if(il){const m=l.match(/^\s*\d+\.\s*(.+?)\s*$/); if(m)sw[cur].push(m[1]); else if(l.trim())il=false;}
}
console.log('model                      bin   text   diff  SWfaces  match?');
let hits=0,n=0;
for(const d of fs.readdirSync(B).sort()){
 const dir=path.join(B,d); if(!fs.statSync(dir).isDirectory())continue;
 const xb=strip(fs.readFileSync(path.join(dir,'model.x_b')));
 const b=E.binary(xb), bin=xb.readUInt16BE(b.end+5);
 const t=E.textPrefix(fs.readFileSync(path.join(dir,'model.x_t'),'latin1'));
 const txt=+t.next.match(/^Z1 (\d+)/)[1];
 const f=(sw[d]||[]).length, diff=bin-txt, ok=diff===f;
 n++; if(ok)hits++;
 console.log(`${d.padEnd(26)}${String(bin).padStart(4)}${String(txt).padStart(7)}${String(diff).padStart(7)}${String(f).padStart(9)}   ${ok?'yes':'NO'}`);
}
console.log(`\nbinary - text == SolidWorks face count in ${hits}/${n} models`);
