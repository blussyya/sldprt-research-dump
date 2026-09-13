const fs = require('fs');
const path = require('path');
const { extractMesh, setVerbose, toBinarySTL } = require('C:\\Users\\basha\\Desktop\\soldiworks research\\v0.3.1\\src\\sldprt-extractor.js');

setVerbose(true);

const files = [
  'C:\\Users\\basha\\Desktop\\soldiworks research\\test files original\\Dekor.SLDPRT',
  'C:\\Users\\basha\\Desktop\\soldiworks research\\test files original\\Helical Bevel Gear.SLDPRT'
];

for (const filePath of files) {
  console.log('\n' + '='.repeat(80));
  console.log(`FILE: ${path.basename(filePath)}`);
  console.log(`SIZE: ${fs.statSync(filePath).size} bytes`);
  console.log('='.repeat(80));

  const fileBuf = fs.readFileSync(filePath);
  
  // Check header bytes
  const isOLE2 = fileBuf[0] === 0xD0 && fileBuf[1] === 0xCF && fileBuf[2] === 0x11 && fileBuf[3] === 0xE0;
  const isPK = fileBuf[0] === 0x50 && fileBuf[1] === 0x4B;
  
  console.log(`\nFormat Detection:`);
  console.log(`  First 32 bytes (hex): ${Array.from(fileBuf.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
  console.log(`  OLE2 (Compound File): ${isOLE2}`);
  console.log(`  PK/ZIP (OpenXML): ${isPK}`);
  console.log(`  buf[7] === 4: ${fileBuf[7] === 4} (byte=0x${fileBuf[7].toString(16)})`);
  
  // Find all potential displaylist markers
  const marker32_1 = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00]);
  const positions32 = [];
  for (let i = 0; i <= fileBuf.length - 8; i++) {
    if (fileBuf[i] === 1 && fileBuf[i+1] === 0 && fileBuf[i+2] === 0 && fileBuf[i+3] === 0 &&
        fileBuf[i+4] === 1 && fileBuf[i+5] === 0 && fileBuf[i+6] === 0 && fileBuf[i+7] === 0) {
      positions32.push(i);
    }
  }
  console.log(`\n  Positions of [01 00 00 00 01 00 00 00] pattern: ${positions32.length}`);
  if (positions32.length > 0) {
    console.log(`    First 5: ${positions32.slice(0, 5).join(', ')}`);
  }

  // Find face marker pattern: 0C 00 00 00 64 00 00 00
  const faceMarker = Buffer.from([0x0c, 0x00, 0x00, 0x00, 0x64, 0x00, 0x00, 0x00]);
  const markerPos = [];
  for (let i = 0; i <= fileBuf.length - 8; i++) {
    if (fileBuf[i] === 0x0c && fileBuf[i+1] === 0 && fileBuf[i+2] === 0 && fileBuf[i+3] === 0 &&
        fileBuf[i+4] === 0x64 && fileBuf[i+5] === 0 && fileBuf[i+6] === 0 && fileBuf[i+7] === 0) {
      markerPos.push(i);
    }
  }
  console.log(`  Face marker [0C 00 00 00 64 00 00 00] positions: ${markerPos.length}`);
  if (markerPos.length > 0) {
    // Analyze a few markers
    for (let mi = 0; mi < Math.min(5, markerPos.length); mi++) {
      const mp = markerPos[mi];
      if (mp >= 4 && mp + 16 <= fileBuf.length) {
        const edgeCount = fileBuf.readUInt32LE(mp - 4);
        const faceType = fileBuf.readUInt32LE(mp + 8);
        const vertexCount = fileBuf.readUInt32LE(mp + 12);
        console.log(`    Marker @${mp}: edgeCount=${edgeCount}, faceType=${faceType}, vertexCount=${vertexCount}`);
      }
    }
  }

  // Check for openswx stream markers  
  const streamMarker = Buffer.from([0x14, 0x00, 0x06, 0x00, 0x08, 0x00]);
  const streamPos = [];
  for (let i = 0; i <= fileBuf.length - 6; i++) {
    if (fileBuf[i] === 0x14 && fileBuf[i+1] === 0 && fileBuf[i+2] === 6 && fileBuf[i+3] === 0 &&
        fileBuf[i+4] === 8 && fileBuf[i+5] === 0) {
      streamPos.push(i);
    }
  }
  console.log(`  openswx stream markers [14 00 06 00 08 00]: ${streamPos.length}`);

  // Now run extractMesh properly with buffer
  try {
    console.log(`\n--- extractMesh output (buffer input) ---`);
    const startTime = Date.now();
    const result = extractMesh(fileBuf);
    const elapsed = Date.now() - startTime;
    
    console.log(`\n--- Extraction Summary ---`);
    console.log(`  Time: ${elapsed}ms`);
    console.log(`  Vertices: ${result.vertices ? result.vertices.length / 3 : 0}`);
    console.log(`  Faces: ${result.faces ? result.faces.length : 0}`);
    console.log(`  Errors: ${result.errors ? result.errors.length : 0}`);
    console.log(`  Warnings: ${result.warnings ? result.warnings.length : 0}`);
    
    if (result.errors && result.errors.length > 0) {
      console.log(`  Errors:`);
      result.errors.forEach((e, i) => console.log(`    [${i}] ${e}`));
    }
    if (result.warnings && result.warnings.length > 0) {
      console.log(`  Warnings:`);
      result.warnings.forEach((w, i) => console.log(`    [${i}] ${w}`));
    }
    
    if (result.faces && result.faces.length > 0) {
      const faceVertexCounts = result.faces.map(f => f.length);
      const minVerts = Math.min(...faceVertexCounts);
      const maxVerts = Math.max(...faceVertexCounts);
      const uniqueCounts = [...new Set(faceVertexCounts)].sort((a, b) => a - b);
      
      console.log(`\n  Face Structure Analysis:`);
      console.log(`    Min vertices/face: ${minVerts}`);
      console.log(`    Max vertices/face: ${maxVerts}`);
      console.log(`    Unique vertex counts: [${uniqueCounts.join(', ')}]`);
      
      const countBySize = {};
      for (const c of faceVertexCounts) {
        countBySize[c] = (countBySize[c] || 0) + 1;
      }
      console.log(`    Face count by vertex count:`);
      for (const [size, count] of Object.entries(countBySize).sort((a, b) => Number(a[0]) - Number(b[0]))) {
        console.log(`      ${size} verts: ${count} faces`);
      }
      
      // First 10 faces
      console.log(`\n    First 10 faces:`);
      for (let i = 0; i < Math.min(10, result.faces.length); i++) {
        console.log(`      Face ${i} (${result.faces[i].length} verts): [${result.faces[i].slice(0, 8).join(', ')}${result.faces[i].length > 8 ? '...' : ''}]`);
      }

      // Check for degenerate faces
      let degenerateCount = 0;
      let duplicateVertCount = 0;
      for (const face of result.faces) {
        const uniqueVerts = new Set(face);
        if (uniqueVerts.size < face.length) duplicateVertCount++;
        if (face.length === 3) {
          if (face[0] === face[1] || face[1] === face[2] || face[0] === face[2]) degenerateCount++;
        }
      }
      console.log(`\n    Degenerate triangles: ${degenerateCount}`);
      console.log(`    Faces with duplicate vertices: ${duplicateVertCount}`);
      
      const numVertices = result.vertices.length / 3;
      let outOfRangeCount = 0;
      for (const face of result.faces) {
        for (const idx of face) {
          if (idx < 0 || idx >= numVertices) outOfRangeCount++;
        }
      }
      console.log(`    Out-of-range vertex indices: ${outOfRangeCount}`);
    }
    
    if (result.vertices && result.vertices.length > 0) {
      const numVerts = result.vertices.length / 3;
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;
      
      for (let i = 0; i < result.vertices.length; i += 3) {
        const x = result.vertices[i];
        const y = result.vertices[i + 1];
        const z = result.vertices[i + 2];
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
      }
      
      console.log(`\n  Vertex Bounding Box:`);
      console.log(`    X: [${minX.toFixed(4)}, ${maxX.toFixed(4)}] range=${(maxX - minX).toFixed(4)}`);
      console.log(`    Y: [${minY.toFixed(4)}, ${maxY.toFixed(4)}] range=${(maxY - minY).toFixed(4)}`);
      console.log(`    Z: [${minZ.toFixed(4)}, ${maxZ.toFixed(4)}] range=${(maxZ - minZ).toFixed(4)}`);
    }
    
    // Test binary STL output
    try {
      const stlBuf = toBinarySTL(result);
      const triCount = stlBuf.readUInt32LE(80);
      console.log(`\n  Binary STL: ${triCount} triangles, ${stlBuf.length} bytes`);
    } catch (stlErr) {
      console.log(`\n  Binary STL failed: ${stlErr.message}`);
    }
    
  } catch (err) {
    console.log(`\n!!! EXTRACTION FAILED !!!`);
    console.log(`  Error: ${err.message}`);
    console.log(`  Stack: ${err.stack}`);
  }
}
