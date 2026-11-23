// Reads results.jsonl and prints the counts used in findings.md.
const fs=require('fs');
const rows=fs.readFileSync(__dirname+'/results.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));
const multi=rows.filter(r=>r.candidates>=2);
const scored=multi.filter(r=>r.fits&&r.fits.length>=1);
const tied=scored.filter(r=>r.fits.length>1);
const err=rows.filter(r=>r.headError||r.OLDError||r.FULLError);
const shuffleBad=tied.filter(r=>r.distinctPicks.length>1);
const headVsOld=tied.filter(r=>r.headPick!==r.OLDPick);
const headVsFull=tied.filter(r=>r.headPick!==r.FULLPick);
const header=multi.filter(r=>r.chosenBy==='Header2');
const lowest=multi.filter(r=>r.chosenBy!=='Header2');
const out={files:rows.length,skipped:rows.filter(r=>r.skip).length,multiPartition:multi.length,
  withHeaderTruth:header.length,lowestOnly:lowest.length,
  fitsEmpty:multi.filter(r=>!r.fits||r.fits.length===0).length,
  tiedByBoxAndFaces:tied.length,
  tiedByChoose_distinctAcrossOrders:shuffleBad.length,
  headVsOld_pickDiffers:headVsOld.map(r=>r.file),
  headVsFull_pickDiffers:headVsFull.map(r=>r.file),
  errors:err.map(r=>({file:r.file,headError:r.headError,OLDError:r.OLDError,FULLError:r.FULLError})),
  maxDisplayFaces:Math.max(...multi.map(r=>r.displayFaces||0)),
  maxHeadMs:Math.max(...multi.map(r=>r.headMs||0)),
  headerFilesPickEqualsActive:header.filter(r=>r.headPick===r.active).length,
  headerFilesPickDiffersFromActive:header.filter(r=>r.headPick!==r.active).map(r=>({file:r.file,active:r.active,pick:r.headPick,fits:r.fits})),
  shuffleExamples:shuffleBad.slice(0,10).map(r=>({file:r.file,fits:r.fits,picks:r.distinctPicks}))};
console.log(JSON.stringify(out,null,1));
