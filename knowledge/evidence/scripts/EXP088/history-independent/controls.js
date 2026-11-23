'use strict';
const fs=require('fs'),P=require((process.env.SLDPRT_CONVERTER||require('path').resolve(__dirname,'../../../../../../solidworks-converters'))+'/src/parasolid/partition'),{read}=require('./check');
const file=process.argv[2],streams=P.streams(fs.readFileSync(file));
const b=Buffer.from(streams[Object.keys(streams).find(k=>/Biography$/.test(k))]);
const cases=[['class tag',x=>x.writeUInt16LE(0,0)],['record count too high',x=>x.writeUInt32LE(999,19)],['record count too low',x=>x.writeUInt32LE(0,19)],['first string length',x=>x.writeUInt8(254,62)],['numeric field changed',x=>x.writeUInt32LE(12345,23)]];
console.log(JSON.stringify(cases.map(([name,mutate])=>{const x=Buffer.from(b);mutate(x);try{return {name,accepted:true,count:read(x).count}}catch(e){return {name,accepted:false,error:e.message}}}),null,2));
