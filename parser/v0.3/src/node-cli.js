#!/usr/bin/env node
'use strict';
const fs=require('fs'),zlib=require('zlib'),parser=require('./parser-core');
const args=process.argv.slice(2);
if(args.length!==1){console.error('Usage: node parser/v0.3/src/node-cli.js model.SLDPRT > parsed.json');process.exit(2);}
const result=parser.parseSLDPRT(fs.readFileSync(args[0]),b=>zlib.inflateRawSync(b,{maxOutputLength:128*1024*1024}),b=>zlib.inflateSync(b,{maxOutputLength:128*1024*1024}));
console.log(JSON.stringify(result,(_,v)=>ArrayBuffer.isView(v)?Array.from(v):v));
if(result.errors.length||result.rejected.length)process.exitCode=1;
