// per-file and total counts from corpus.jsonl. "strict" = distance > 1e-9 + half-ulp float32 slack of the vertex.
const fs=require('fs');
const rows=fs.readFileSync('corpus.jsonl','utf8').trim().split('\n').map(l=>{try{return JSON.parse(l)}catch(e){return {file:'?',error:'unparsable'}}});
const T={files:rows.length,errored:0,filesWithCylCone:0,faces:0,verts:0,off:0,offFitsClaim:0,offNotBoundary:0,offNotShared:0,offNotChord:0,offChordUntested:0,max:0,filesWithOff:0,filesWhereClaimFails:0,
  strict:{n:0,notBoundary:0,notShared:0,notChord:0,untested:0,fits:0,fits2:0,max:0,filesWithAny:0,filesFailing:0}};
const lines=[];
for(const r of rows){
  const n=r.file.split('/').pop();
  if(r.error){T.errored++;lines.push(n+'\terror: '+r.error);continue;}
  if(!r.cylConeFaces)continue;
  const s=r.beyondSlackSubset;
  T.filesWithCylCone++;T.faces+=r.cylConeFaces;T.verts+=r.verticesChecked;T.off+=r.off;T.offFitsClaim+=r.offFitsClaim;T.offNotBoundary+=r.offNotBoundary;T.offNotShared+=r.offNotShared;T.offNotChord+=r.offNotChord;T.offChordUntested+=r.offChordUntested;T.max=Math.max(T.max,r.maxDist);
  if(r.off)T.filesWithOff++;
  const fails=r.off-r.offFitsClaim>0;if(fails)T.filesWhereClaimFails++;
  T.strict.n+=s.n;T.strict.notBoundary+=s.notBoundary;T.strict.notShared+=s.notShared;T.strict.notChord+=s.notChord;T.strict.untested+=s.untested;T.strict.fits+=s.fits;T.strict.fits2+=s.fits2;T.strict.max=Math.max(T.strict.max,s.max);
  if(s.n)T.strict.filesWithAny++;if(s.n-s.fits>0)T.strict.filesFailing++;
  lines.push([n,'verts '+r.verticesChecked,'off>1e-9 '+r.off,'fitsClaim '+r.offFitsClaim,'notBoundary '+r.offNotBoundary,'notShared '+r.offNotShared,'notChord '+r.offNotChord,'chordUntested '+r.offChordUntested,'max '+r.maxDist.toExponential(2),'| strict n '+s.n,'fits '+s.fits,'fits(f32 chord tol) '+s.fits2,'notB '+s.notBoundary,'notSh '+s.notShared,'notCh '+s.notChord,'unt '+s.untested,'max '+s.max.toExponential(2)].join('  '));
}
console.log(lines.join('\n'));console.log('TOTAL',JSON.stringify(T,null,1));
