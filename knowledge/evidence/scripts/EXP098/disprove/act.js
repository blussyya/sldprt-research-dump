// act.js <file>: look for independent active-config hints: per-config stream inventory, 'active'/'default' text in small streams.
const P=require('/home/user/solidworks-converters/src/parasolid/partition.js');const s=P.streams(require('fs').readFileSync(process.argv[2]));
const k=Object.keys(s);const ids=new Set();for(const x of k){const m=/Config-(\d+)(-[A-Za-z]+)?/.exec(x);if(m)ids.add(+m[1]);}
const inv={};for(const x of k){const m=/(?:^|\/)Config-(\d+)-?([A-Za-z]*)/.exec(x);if(m&&!/docProps/.test(x))(inv[m[1]]=inv[m[1]]||[]).push((m[2]||'base')+':'+s[x].length);}
console.log(process.argv[2].split('/').pop());for(const [i,v] of Object.entries(inv).slice(0,8))console.log(' cfg',i,v.join(' '));
for(const x of k){if(/Config-\d+-(Partition|LWDATA|ResolvedFeatures)$/.test(x))continue;const t=Buffer.from(s[x]);const a=t.toString('latin1'),b=t.toString('utf16le');
 for(const [n,tx] of [['l',a],['u',b]]){const m=tx.match(/.{0,50}(ctive ?[Cc]onfig|ActiveConf|Default|DefaultConf).{0,60}/);if(m&&!/\x00\x00\x00\x00/.test(m[0].slice(0,20)))console.log(' hint',x,n,JSON.stringify(m[0].replace(/[^\x20-\x7e]/g,'.')).slice(0,160));}}
