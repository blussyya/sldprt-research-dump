// Controls for the flag reader and the attribute reader.
const fs=require('fs');const {entries}=require('./entries.js');const {readAttr}=require('./attr_value.js');
const d='work/lb/';const idx=JSON.parse(fs.readFileSync(d+'index.json'));
const out={};
// C0: flag byte values across all marked entries
const fb={};
for(const e of idx){const b=fs.readFileSync(d+e.file);for(const x of entries(b)){if(x.marker<0)continue;const f=b[x.lenPos-5];fb[f]=(fb[f]||0)+1;}}
out.flagByteValues=fb;
// C1: the 8 entries without the attribute: confirm the name is absent in any encoding
const miss=[];
for(const e of idx){const b=fs.readFileSync(d+e.file);for(const x of entries(b)){if(x.marker<0)continue;const p=x.s.payload;
  if(p.indexOf(Buffer.from('BODY_IN_LIGHTWEIGHT_PERM','latin1'))<0){ miss.push([e.stream,e.file,b[x.lenPos-5],p.indexOf(Buffer.from('LIGHTWEIGHT','latin1')),p.indexOf(Buffer.from('LIGHTWEIGHT','utf16le'))]); } }}
out.missingNameCheck=miss;
// C2: byte-edit control on a known entry (lb00, value 1 -> 0)
const lb00=fs.readFileSync(d+'lb00.bin');
const e00=entries(lb00)[0];
const before=readAttr(e00.s.payload,'BODY_IN_LIGHTWEIGHT_PERM');
const edited=Buffer.from(lb00);
const pos=e00.s.at+e00.s.payload.indexOf(Buffer.from('BODY_IN_LIGHTWEIGHT_PERM','latin1'));
// Edit the decompressed payload instead of the compressed frame: rebuild a payload copy.
const payload=Buffer.from(e00.s.payload);
const h=payload.indexOf(Buffer.from('BODY_IN_LIGHTWEIGHT_PERM','latin1'));
const r=before.valueAt;
const savedVal=payload[r+11];
payload[r+11]=0;                                   // value byte 1 -> 0
const after=readAttr(payload,'BODY_IN_LIGHTWEIGHT_PERM');
out.editValue={beforeStatus:before.status,beforeValue:before.value,afterValue:after.value,afterStatus:after.status};
// C3: break the instance link (definition id changed by one) -> reader must report missing or no instance
const p2=Buffer.from(e00.s.payload);
const inst=before.inst;p2.writeUInt16BE(p2.readUInt16BE(inst+10)+1,inst+10);
const after2=readAttr(p2,'BODY_IN_LIGHTWEIGHT_PERM');
out.breakLink={status:after2.status};
// C4: decode a different attribute with the same reader (ATOM_ID_2001, LAST_BODY_MODIFYING_FEATURE_ID) on lb01 entry 0
const lb01=entries(fs.readFileSync(d+'lb01.bin'))[0].s.payload;
out.otherAttrs={
  ATOM_ID_2001:readAttr(lb01,'ATOM_ID_2001'),
  LAST_BODY_MODIFYING_FEATURE_ID:readAttr(lb01,'LAST_BODY_MODIFYING_FEATURE_ID'),
  ENT_TIME_STAMP_2001:readAttr(lb01,'ENT_TIME_STAMP_2001'),
  BODY_IN_LIGHTWEIGHT_PERM:readAttr(lb01,'BODY_IN_LIGHTWEIGHT_PERM')};
// C5: flag-byte flip on lb01 entry 0 (flag 1 -> 0), the reader must follow the byte
const lb01b=Buffer.from(fs.readFileSync(d+'lb01.bin'));
const x01=entries(lb01b)[0];out.flagFlip={before:lb01b[x01.lenPos-5]};lb01b[x01.lenPos-5]=0;
out.flagFlip.after=entries(lb01b)[0] && lb01b[entries(lb01b)[0].lenPos-5];
console.log(JSON.stringify(out,null,1));
