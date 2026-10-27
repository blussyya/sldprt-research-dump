const D=require('path').join(__dirname,'../../../../../solidworks-converters/src/')+'/';
const P=require(D+'parasolid/partition'),Disp=require(D+'display'),Z=require(D+'inflate'),fs=require('fs');
let ok=0,bad=[];
for(const f of fs.readFileSync(0,'utf8').trim().split('\n')){let raw;try{raw=fs.readFileSync(f);}catch{continue}
  const d=Disp.parseSLDPRT(raw,Z.inflateRaw,Z.inflate).faces.length;if(!d)continue;let r;try{r=P.readBody(raw);}catch(e){continue;}
  const by=new Map(r.parsed.nodes.map(n=>[n.index,n]));let all=0,solid=0;
  for(const n of r.parsed.nodes.filter(n=>n.type===14)){all++;const sh=by.get(n.values.shell)||by.get(n.values.front_shell);const b=sh&&by.get(sh.values.body);if(b&&b.values.body_type===1)solid++;}
  if(all===d||solid===d)ok++;else bad.push(f.split('/').pop().slice(0,26)+' disp '+d+' all '+all+' solid '+solid+' '+r.kind);}
console.log('match',ok,'mismatch',bad.length);console.log(bad.join('\n'));
