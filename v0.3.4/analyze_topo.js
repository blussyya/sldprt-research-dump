const fs = require('fs');
const { extractMesh } = require('./src/sldprt-extractor.js');
const mesh = extractMesh(fs.readFileSync('C:\\Users\\basha\\Desktop\\soldiworks research\\test files original\\usb hub case (ultimate test)\\USB hub case BOTTOM.SLDPRT'));

// Get the raw DisplayLists data by re-running extraction with debug
// Instead, let's examine the face topology and edge data
const topo = mesh._faceTopology;

// FACE#4: ec=13, vc=75 - should have holes
console.log('=== FACE #4 (ec=13, vc=75) ===');
console.log('Topology:', JSON.stringify(topo[4]));
console.log('Face vertices:', mesh.faces[4].length, 'indices');

// FACE#5: ec=5, vc=212 - should have holes  
console.log('\n=== FACE #5 (ec=5, vc=212) ===');
console.log('Topology:', JSON.stringify(topo[5]));
console.log('Face vertices:', mesh.faces[5].length, 'indices');

// FACE#10: ec=10, vc=122
console.log('\n=== FACE #10 (ec=10, vc=122) ===');
console.log('Topology:', JSON.stringify(topo[10]));
console.log('Face vertices:', mesh.faces[10].length, 'indices');

// FACE#43: ec=31, vc=104
console.log('\n=== FACE #43 (ec=31, vc=104) ===');
console.log('Topology:', JSON.stringify(topo[43]));
console.log('Face vertices:', mesh.faces[43].length, 'indices');

// FACE#49: ec=27, vc=103
console.log('\n=== FACE #49 (ec=27, vc=103) ===');
console.log('Topology:', JSON.stringify(topo[49]));
console.log('Face vertices:', mesh.faces[49].length, 'indices');

// Now let's analyze the topology structure
// The first block: [4, 8, 2, N, ...N values...]
// The second block should follow at topoStart + (N+4)*4
// Let me see if I can access the raw buffer

// Look for faces where edgeCount != vertexCount
console.log('\n=== Face Summary (sorted by ec/vc ratio) ===');
const faceData = [];
for (let i = 0; i < mesh.faces.length; i++) {
    const t = topo[i];
    const ec = t ? t.edgeIndices.length : 0;
    const vc = mesh.faces[i].length;
    faceData.push({ idx: i, ec, vc, ratio: ec/vc, topoStart: t ? t.topoStart : 0 });
}
faceData.sort((a, b) => a.ratio - b.ratio);
for (const f of faceData) {
    if (f.vc >= 10) {
        console.log('  Face #' + f.idx + ': ec=' + f.ec + ', vc=' + f.vc + ', ratio=' + f.ratio.toFixed(3) + ', topoStart=' + f.topoStart);
    }
}
