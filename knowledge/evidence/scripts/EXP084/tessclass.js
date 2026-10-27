const R=require('path').join(__dirname,'../../../../../solidworks-converters/src/');
const M=require(R+'container/modern'),Z=require(R+'inflate'),D=require(R+'display');const fs=require('fs'),path=require('path');
const root=process.argv[2];const tally={};
for(const y of fs.readdirSync(root).filter(d=>/^\d{4}$/.test(d)))for(const f of fs.readdirSync(path.join(root,y))){
  const b=fs.readFileSync(path.join(root,y,f));if(M.isOLE2(b))continue;
  const s=M.decompressOpenSX(b,Z.inflateRaw,Z.inflate);const k=Object.keys(s).find(k=>/DisplayLists$/.test(k));
  const has=k?Buffer.from(s[k]).includes('uoTempBodyTessData_c'):null;const faces=D.parseSLDPRT(b,Z.inflateRaw,Z.inflate).faces.length;
  const key=(k?'DL':'noDL')+' tess='+has+' faces>0='+(faces>0);tally[key]=(tally[key]||[]);tally[key].push(f.slice(0,8));}
for(const [k,v] of Object.entries(tally))console.log(k,v.length,v.length<12?v.join(' '):'');
