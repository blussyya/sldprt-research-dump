'use strict';
// DLUpdateStamp and Features-XML swLastModifiedStamp vs the per-feature 'order' counter (max over the nodes read).
const fs=require('fs'),path=require('path');const P=require('../../../../package/src/parasolid/partition');
const sv=require('./out/survey_all.json');const root='/home/user/sldprt-research-dump/';
let n=0,eqXml=0,eqMax1=0,eqMax=0,ge=0,lt=0;const odd=[];
for(const r of sv){if(!r.nodes||!r.nodes.length||r.err)continue;   // only fully read trees, so max(order) is over every feature
 const all=P.streams(fs.readFileSync(root+r.file));const dl=Object.keys(all).find(k=>/DLUpdateStamp$/.test(k));const fx=Object.keys(all).find(k=>/swXmlContents\/Features$/.test(k));
 if(!dl||!fx)continue;const d=all[dl].readUInt32LE(0);const m=/swLastModifiedStamp="(\d+)"/.exec(all[fx].toString('utf8'));if(!m)continue;
 const mx=Math.max(...r.nodes.map(x=>x.order));n++;if(d===+m[1])eqXml++;if(d===mx+1)eqMax1++;if(d===mx)eqMax++;if(d>=mx)ge++;else{lt++;odd.push([r.file.slice(-40),d,mx]);}}
console.log({files:n,'DLUpdateStamp==swLastModifiedStamp':eqXml,'DL==max(order)+1':eqMax1,'DL==max(order)':eqMax,'DL>=max(order)':ge,'DL<max':lt});console.log(odd.slice(0,5));
