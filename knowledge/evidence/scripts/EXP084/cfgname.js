const R=require('path').join(__dirname,'../../../../../solidworks-converters/src/');
const P=require(R+'parasolid/partition'),D=require(R+'display'),Z=require(R+'inflate'),X=require(R+'parasolid/xt'),fs=require('fs');
const u16=b=>{const o=[];const B=Buffer.from(b);for(let i=0;i+5<B.length;i++)if(B[i]===0xff&&B[i+1]===0xfe&&B[i+2]===0xff){const n=B[i+3];if(n>0&&i+4+2*n<=B.length)o.push(B.subarray(i+4,i+4+2*n).toString('utf16le'));}return o;};
for(const f of process.argv.slice(2)){const raw=fs.readFileSync(f),s=P.streams(raw);
  const d=D.parseSLDPRT(raw,Z.inflateRaw,Z.inflate).faces.length;
  const h2=u16(s.Header2||[]);console.log('##',f.split('/').pop().slice(0,30),'display',d,'Header2 strings:',h2.slice(0,8).join(' | '));
  for(const k of Object.keys(s).filter(k=>/Contents\/Config-\d+-Partition$/.test(k))){const n=/Config-(\d+)-/.exec(k)[1];
    let faces='?';try{const inner=P.sections(s[k],0).out[0].body;faces=X.parse(inner,true).nodes.filter(x=>x.type===14).length;}catch(e){}
    const names=u16(s['Contents/Config-'+n]||[]).slice(0,3);console.log('  N='+n,'faces',faces,'cfg strings',names.join(' | '),'preview',!!s['Config-'+n+'-Preview']);}}
