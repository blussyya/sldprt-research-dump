#!/usr/bin/env node
'use strict';
/* Correlate EXP-091's named configuration-envelope record with the DisplayLists declaration and
 * coarse file structure. This inventories an observed version boundary; it does not infer a
 * mandatory format rule from later files that still omit the record. */
const fs=require('fs'),path=require('path');
const M=require('../../../../package/src/container/modern');
const P=require('../../../../package/src/parasolid/partition');
const prior=require('../EXP091/configuration-bounds.json');

const ROOT=path.resolve(__dirname,'../../../..'),rows=[];
for(const source of prior.rows.filter(r=>!r.legacy)){
  const streams=P.streams(fs.readFileSync(path.join(ROOT,source.file))),names=Object.keys(streams);
  const configIds=[...new Set(names.map(n=>(/Config-(\d+)/.exec(n)||[])[1]).filter(x=>x!==undefined))].map(Number).sort((a,b)=>a-b);
  rows.push({file:source.file,year:(source.file.match(/test files online\/(\d{4})\//)||[])[1]||'controlled',
    displayListsVersion:M.displayListsVersion(streams),faces:source.faces,configurationRecords:source.configurationRecords,
    arithmeticSurplus:source.surplus,hasLocalBodies:names.some(n=>/LocalBodies$/.test(n)),configIds,
    modelHeaders:names.filter(n=>/Config-\d+-ModelHeader$/.test(n)).length});
}

const byVersion={};for(const version of [...new Set(rows.map(r=>r.displayListsVersion))].sort((a,b)=>a-b)){
  const rs=rows.filter(r=>r.displayListsVersion===version),readable=rs.filter(r=>r.faces>0);
  byVersion[version]={files:rs.length,withConfigurationRecord:rs.filter(r=>r.configurationRecords).length,
    readableFaceFiles:readable.length,readableWithConfigurationRecord:readable.filter(r=>r.configurationRecords).length};
}
const structural={};
for(const r of rows.filter(r=>r.displayListsVersion>=13000&&r.faces>0)){
  const key=`localBodies=${r.hasLocalBodies},multipleConfigIds=${r.configIds.length>1}`;
  structural[key]??={files:0,withConfigurationRecord:0};structural[key].files++;
  if(r.configurationRecords)structural[key].withConfigurationRecord++;
}
function band(rs){return {files:rs.length,withConfigurationRecord:rs.filter(r=>r.configurationRecords).length,
  readableFaceFiles:rs.filter(r=>r.faces>0).length,arithmeticSurplus:rs.reduce((n,r)=>n+r.arithmeticSurplus,0)};}
const before=rows.filter(r=>r.displayListsVersion<=12000),after=rows.filter(r=>r.displayListsVersion>=13000);
const result={summary:{modernFiles:rows.length,byVersion,before13000:band(before),from13000:band(after),
  firstVersionWithRecord:Math.min(...rows.filter(r=>r.configurationRecords).map(r=>r.displayListsVersion)),structural},rows};
fs.writeFileSync(path.join(__dirname,'configuration-presence.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.summary,null,2));
