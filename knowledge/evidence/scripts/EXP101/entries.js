// Own LocalBodies entry splitter.
// Entry header region = bytes from the previous section's end up to this section's size field.
// It holds "ff fe ff" + u8 nchars + UTF-16LE name, then a gap, then u32 len (= size + 5), then 00, then the section frame.
const {sections}=require('./sections.js');
function entries(buf){
  const secs=sections(buf);const out=[];let prevEnd=0;
  for(const s of secs){
    const lenPos=s.at-5;
    const lenVal=buf.readUInt32LE(lenPos);
    let m=-1;
    for(let i=lenPos-4;i>=prevEnd;i--){ if(buf[i]===0xff&&buf[i+1]===0xfe&&buf[i+2]===0xff){m=i;break;} }
    const nChars=m>=0?buf[m+3]:-1;
    const nameStart=m+4, nameEnd=nameStart+2*nChars;
    const name=m>=0?buf.subarray(nameStart,nameEnd).toString("utf16le"):"";
    out.push({s,prevEnd,lenPos,lenVal,marker:m,nChars,nameEnd,name,gap:buf.subarray(nameEnd,lenPos),lenCheck:lenVal===s.size+5,byteBeforeSize:buf[s.at+0-1]});
    prevEnd=s.end;
  }
  return out;
}
module.exports={entries};
