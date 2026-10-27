const R=require('path').join(__dirname,'../../../../../solidworks-converters/src/');
const P=require(R+'parasolid/partition'),X=require(R+'parasolid/xt'),D=require(R+'display'),Z=require(R+'inflate'),fs=require('fs');
const G=Buffer.from(P.GUID);
function secs(b){const B=Buffer.from(b),o=[];let i=B.indexOf(G);while(i>=4){const w=P.sections(b.subarray(0,i-4+4+B.readUInt32LE(i-4)),i-4);for(const x of w.out)if(x.kind!=='deltas')o.push(X.parse(x.body,true));i=B.indexOf(G,i+1);}return o;}
const typ=q=>{const by=new Map(q.nodes.map(n=>[n.index,n]));const r={solid:0,sheet:0};for(const n of q.nodes.filter(n=>n.type===14)){const sh=by.get(n.values.shell)||by.get(n.values.front_shell);const b=sh&&by.get(sh.values.body);if(b)r[b.values.body_type===1?'solid':'sheet']++;}return r;};
for(const f of fs.readFileSync(0,'utf8').trim().split('\n')){let raw,s;try{raw=fs.readFileSync(f);s=P.streams(raw);}catch{continue}
  const parts=Object.keys(s).filter(k=>/Config-\d+-Partition$/.test(k));if(!parts.length)continue;
  const d=D.parseSLDPRT(raw,Z.inflateRaw,Z.inflate).faces.length;if(!d)continue;
  let best=null;
  for(const k of parts){const n=/Config-(\d+)-/.exec(k)[1];let p={solid:0,sheet:0};try{p=typ(secs(s[k])[0]);}catch{}
    const L={solid:0,sheet:0};for(const kk of Object.keys(s).filter(x=>x==='Config-'+n+'-FeatureBodies/LocalBodies'))for(const q of secs(s[kk])){const t=typ(q);L.solid+=t.solid;L.sheet+=t.sheet;}
    const c={Ps:p.solid,Pall:p.solid+p.sheet,'Ps+L':p.solid+L.solid+L.sheet,'Pall+L':p.solid+p.sheet+L.solid+L.sheet,'Psh+L':p.sheet+L.solid+L.sheet,'Ps+Ls':p.solid+L.solid};
    const hit=Object.entries(c).filter(([,v])=>v===d).map(([k])=>k);if(!best||hit.length)best={n,c,hit};if(hit.length)break;}
  console.log(f.split('/').pop().slice(0,24).padEnd(24),'disp',String(d).padStart(5),'N='+best.n,best.hit.join(',')||'NONE '+JSON.stringify(best.c));}
