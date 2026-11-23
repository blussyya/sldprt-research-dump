const fs=require('fs');
const rows=fs.readFileSync(__dirname+'/rows.jsonl','utf8').trim().split('\n').map(JSON.parse);
const key=r=>[r.w[0],r.w[1],r.w[3],r.w[4]].join('');
const seen={};
for(const r of rows){const k=key(r);seen[k]=seen[k]||[];
 if(seen[k].length<(k=='0111'?3:4)&&(seen[k].length==0||r.file!==seen[k][seen[k].length-1].file))seen[k].push(r);}
for(const k in seen){console.log('STATE',k);for(const r of seen[k]){
 console.log(' ',r.file.split('/').slice(-2).join('/'),r.tag,r.hex.match(/.{8}/g).join(' '));}}
