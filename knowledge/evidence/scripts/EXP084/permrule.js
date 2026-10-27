const D=require('path').join(__dirname,'../../../../../solidworks-converters/src/')+'/';
const P=require(D+'parasolid/partition'),X=require(D+'parasolid/xt'),Disp=require(D+'display'),Z=require(D+'inflate'),fs=require('fs');
const G=Buffer.from(P.GUID);
function secs(b){const B=Buffer.from(b),o=[];let i=B.indexOf(G);while(i>=4){const w=P.sections(b.subarray(0,i-4+4+B.readUInt32LE(i-4)),i-4);for(const x of w.out)if(x.kind!=='deltas')o.push(X.parse(x.body,true));i=B.indexOf(G,i+1);}return o;}
// per body: faces and BODY_IN_LIGHTWEIGHT_PERM (undefined when absent)
function bodies(q){const by=new Map(q.nodes.map(n=>[n.index,n]));const str=n=>n?(Array.isArray(n.values.string)?n.values.string.join(''):n.values.string):'';
  const out=new Map();for(const b of q.nodes.filter(n=>n.type===12))out.set(b.index,{faces:0,flag:undefined,type:b.values.body_type});
  for(const f of q.nodes.filter(n=>n.type===14)){const sh=by.get(f.values.shell)||by.get(f.values.front_shell);const x=sh&&out.get(sh.values.body);if(x)x.faces++;}
  for(const a of q.nodes.filter(n=>n.type===81)){const x=out.get(a.values.owner);if(!x)continue;const def=by.get(a.values.definition);if(!def||str(by.get(def.values.identifier))!=='BODY_IN_LIGHTWEIGHT_PERM')continue;const v=(a.values.fields||[]).map(i=>by.get(i)).find(n=>n&&n.type===82);x.flag=v?v.values.values[0]:undefined;}
  return [...out.values()];}
const tally={};const rows=[];
for(const f of fs.readFileSync(0,'utf8').trim().split('\n')){let raw,s;try{raw=fs.readFileSync(f);s=P.streams(raw);}catch{continue}
  const d=Disp.parseSLDPRT(raw,Z.inflateRaw,Z.inflate).faces.length;if(!d)continue;let r;try{r=P.readBody(raw);}catch{continue}
  const n=/Config-(\d+)-Partition$/.exec(r.configuration?r.configuration.name:'')?.[1];if(n===undefined)continue;
  let bs=[];try{bs=bodies(secs(s[r.configuration.name])[0]);}catch{}
  const lk='Config-'+n+'-FeatureBodies/LocalBodies';if(s[lk])for(const q of secs(s[lk]))bs.push(...bodies(q));
  const keep=bs.filter(b=>b.faces&&b.flag!==0).reduce((a,b)=>a+b.faces,0),flags=[...new Set(bs.filter(b=>b.faces).map(b=>String(b.flag)))].join('/');
  const k=keep===d?'match':'MISMATCH';tally[k]=(tally[k]||0)+1;if(k!=='match'||s[lk])rows.push(k+' '+f.split('/').pop().slice(0,24)+' disp '+d+' kept '+keep+' flags '+flags);}
console.log(tally);console.log(rows.join('\n'));
