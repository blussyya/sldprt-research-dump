const rows=JSON.parse(require('fs').readFileSync('/tmp/claude-0/-home-user/07cc0b43-8431-53bf-9c6e-c1eac6d58a3f/scratchpad/join.json'));
const h={};for(const r of rows)if(r.lay==='C'){h[r.tag]=(h[r.tag]||0)+1;}console.log('C tag histogram',JSON.stringify(h));
const ids=rows.filter(r=>r.lay==='C');console.log('C faces with id<=1000:',ids.filter(r=>r.id<=1000).length,'of',ids.length,'; max id',Math.max(...ids.map(r=>r.id)));
