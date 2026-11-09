// Writes the raw LocalBodies stream bytes (from the converter's stream loader) to a file.
const fs=require('fs');
const P=require('/home/user/conv-dev/src/parasolid/partition');
const [,,src,name,out]=process.argv;
const s=P.streams(fs.readFileSync(src));
fs.writeFileSync(out,Buffer.from(s[name]));
console.log(s[name].length);
