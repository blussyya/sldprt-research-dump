'use strict';
// Created-record checks. (a) SW2011 control: moFR_c stamp vs log Created. (b) History item stamp vs FR stamp and vs node FT, whole corpus.
// (c) negative control: re-pair History stamps with the wrong feature.
const fs=require('fs'),path=require('path');
const {nodes,ft}=require('./survey_nodes');const {comps}=require('./comp');const {frs}=require('./fr');
const root='/home/user/sldprt-research-dump';
const log=require('./out/log2011.json');
// (a)
{const fr=require('./out/fr_SW2011.json');let n=0,eq=0;for(const r of fr){if(r.logC===undefined)continue;n++;if(r.logC===r.stamp)eq++;}
 console.log('(a) SW2011 moFR_c stamp == log Created:',eq,'of',n);
 const sk=fr.filter(r=>/Sketch/.test(r.name)).length;console.log('    FR stamps naming a sketch in the SW2011 set:',sk);}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):/\.sldprt$/i.test(e.name)?[path.join(dir,e.name)]:[]);}
const items=[];const filesWith=new Set();let filesTried=0,filesRead=0;
for(const f of ['test files new','test files original','test files online'].flatMap(d=>walk(path.join(root,d)))){
 filesTried++;let c,rows,fr;try{c=comps(f).filter(x=>x.holder==='moHistoryFeatItemData_c');rows=nodes(f).rows;fr=frs(f);}catch(e){continue;}
 filesRead++;if(!c.length)continue;filesWith.add(f);
 const byId=new Map(rows.filter(n=>n.id!==0xffffffff).map(n=>[n.id,n]));const frm=new Map();for(const x of fr)frm.set(x.feature,x.stamp);
 for(const x of c){const n=byId.get(x.feature);if(!n)continue;const b=Buffer.from(n.tail,'hex');items.push({file:path.relative(root,f),id:x.feature,name:n.name,cls:n.cls,stamp:x.stamp,t:ft(b.readUInt32LE(46),b.readUInt32LE(50)),fr:frm.get(x.feature)});}}
fs.writeFileSync('out/history_items.json',JSON.stringify(items));
console.log('(b) files tried',filesTried,'read to a feature list',filesRead,'with History items',filesWith.size,'items joined to a node',items.length);
const ok=items.filter(i=>i.t>9.5e8);console.log('    items with a FT',ok.length);
const d=ok.map(i=>i.stamp-Math.floor(i.t));const hist={};for(const x of d){const k=x>0?'>0':x===0?'0':x>=-10?'-1..-10':'<-10';hist[k]=(hist[k]||0)+1;}
console.log('    stamp - floor(FT):',hist);
const sk=ok.filter(i=>i.cls==='moProfileFeature_c'),ns=ok.filter(i=>i.cls!=='moProfileFeature_c');
const h2=a=>{const o={};for(const i of a){const x=i.stamp-Math.floor(i.t);const k=x>0?'>0':x===0?'0':x>=-10?'-1..-10':'<-10';o[k]=(o[k]||0)+1;}return o;};
console.log('    sketches',sk.length,h2(sk),' non-sketch',ns.length,h2(ns));
const both=ok.filter(i=>i.fr!==undefined);console.log('    History stamp == FR stamp where both exist:',both.filter(i=>i.fr===i.stamp).length,'of',both.length,both.filter(i=>i.fr!==i.stamp).map(i=>[i.file.slice(-30),i.name,i.stamp-i.fr]));
// (c) negative control: within each file, shift the pairing by one (stamp of feature k with FT of feature k+1)
const byFile={};for(const i of ok)(byFile[i.file]=byFile[i.file]||[]).push(i);
let n=0,eq=0,le=0,rn=0,req=0,rle=0;
for(const f of Object.keys(byFile)){const a=byFile[f];if(a.length<2)continue;for(let k=0;k<a.length;k++){const t=a[(k+1)%a.length];n++;const x=a[k].stamp-Math.floor(t.t);if(x===0)eq++;if(x<=0)le++;}}
console.log('(c) true pairing: equal',ok.filter(i=>i.stamp===Math.floor(i.t)).length,'of',ok.length,' | shifted pairing: equal',eq,'of',n,', stamp<=FT',le,'of',n);
