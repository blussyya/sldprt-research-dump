const fs=require('fs');const P=require('/home/user/solidworks-converters/src/parasolid/partition.js');
const [f,a,b]=process.argv.slice(2);const s=P.streams(fs.readFileSync(f));
const A=Buffer.from(s[a]).toString('latin1'),B=Buffer.from(s[b]).toString('latin1');
console.log(A.length,B.length);let i=0;while(i<A.length&&A[i]===B[i])i++;console.log('first diff',i);
console.log(JSON.stringify(A.slice(0,3200)));console.log('----');console.log(JSON.stringify(B.slice(Math.max(0,i-200),i+300)));
