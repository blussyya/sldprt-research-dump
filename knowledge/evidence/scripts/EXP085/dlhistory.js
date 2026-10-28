// DisplayLists version against the save History: is it one of the file's own releases, and the last?
// usage: node dlhistory.js <dir>
const D=require('path').join(__dirname,'../../../../../solidworks-converters/src/')+'/';
const S=require(D),fs=require('fs'),path=require('path');
function walk(d){let o=[];for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())o=o.concat(walk(p));else if(/\.sldprt$/i.test(e.name))o.push(p);}return o;}
let n=0,inH=0,last=0;
for(const f of walk(process.argv[2])){let i;try{i=S.info(f);}catch(e){continue;}
  const dl=i.displayListsVersion,h=(i.saved&&i.saved.history||[]).map(x=>x.version);if(!dl||!h.length)continue;n++;
  if(h.includes(dl))inH++;if(dl===h[h.length-1])last++;else console.log(dl,'saved',h[h.length-1],h.join('>'),path.relative(process.argv[2],f));}
console.log(n,'files;',inH,'with the DisplayLists version in History;',last,'equal to the last save');
