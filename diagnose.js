const fs = require('fs');
const path = require('path');
const { extractMesh, setVerbose } = require('C:\\Users\\basha\\Desktop\\soldiworks research\\v0.3.1\\src\\sldprt-extractor.js');

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

  // Read first 512 bytes to identify format
  const headerBuf = fs.readFileSync(filePath).slice(0, 512);
  
  // Check for OLE2 magic bytes: D0 CF 11 E0 A1 B1 1A E1
  const isOLE2 = headerBuf[0] === 0xD0 && headerBuf[1] === 0xCF && 
                  headerBuf[2] === 0x11 && headerBuf[3] === 0xE0;
  
  // Check for PK (ZIP/openswx) magic bytes: 50 4B
  const isPK = headerBuf[0] === 0x50 && headerBuf[1] === 0x4B;
  
  console.log(`\nFormat Detection:`);
  console.log(`  First 16 bytes (hex): ${Array.from(headerBuf.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
  console.log(`  OLE2 (Compound File): ${isOLE2}`);
  console.log(`  PK/ZIP (OpenXML): ${isPK}`);
  
  if (!isOLE2 && !isPK) {
    // Try to read as text to see if it's something else
    const textStart = headerBuf.toString('utf8').replace(/[^\x20-\x7E]/g, '.');
    console.log(`  Text preview: "${textStart.substring(0, 100)}"`);
  }

  try {
    console.log(`\n--- extractMesh output ---`);
    const startTime = Date.now();
    const result = extractMesh(filePath);
    const elapsed = Date.now() - startTime;
    
    console.log(`\n--- Extraction Summary ---`);
    console.log(`  Time: ${elapsed}ms`);
    console.log(`  Vertices: ${result.vertices ? result.vertices.length / 3 : 0}`);
    console.log(`  Faces: ${result.faces ? result.faces.length : 0}`);
    console.log(`  Errors: ${result.errors ? result.errors.length : 0}`);
    console.log(`  Warnings: ${result.warnings ? result.warnings.length : 0}`);
    
    if (result.errors && result.errors.length > 0) {
      console.log(`  Errors detail:`);
      result.errors.forEach((e, i) => console.log(`    [${i}] ${e}`));
    }
    if (result.warnings && result.warnings.length > 0) {
      console.log(`  Warnings detail:`);
      result.warnings.forEach((w, i) => console.log(`    [${i}] ${w}`));
    }
    
    if (result.faces && result.faces.length > 0) {
      // Analyze face structure
      const faceVertexCounts = result.faces.map(f => f.length);
      const minVerts = Math.min(...faceVertexCounts);
      const maxVerts = Math.max(...faceVertexCounts);
      const uniqueCounts = [...new Set(faceVertexCounts)].sort((a, b) => a - b);
      
      console.log(`\n  Face Structure Analysis:`);
      console.log(`    Min vertices/face: ${minVerts}`);
      console.log(`    Max vertices/face: ${maxVerts}`);
      console.log(`    Unique vertex counts: [${uniqueCounts.join(', ')}]`);
      
      // Count faces by vertex count
      const countBySize = {};
      for (const c of faceVertexCounts) {
        countBySize[c] = (countBySize[c] || 0) + 1;
      }
      console.log(`    Face count by vertex count:`);
      for (const [size, count] of Object.entries(countBySize).sort((a, b) => Number(a[0]) - Number(b[0]))) {
        console.log(`      ${size} verts: ${count} faces`);
      }
      
      // Show first 5 faces
      console.log(`\n    First 5 faces (vertex indices):`);
      for (let i = 0; i < Math.min(5, result.faces.length); i++) {
        console.log(`      Face ${i}: [${result.faces[i].join(', ')}]`);
      }
      
      // Check for degenerate faces (0-area triangles, duplicate vertices)
      let degenerateCount = 0;
      let duplicateVertCount = 0;
      for (const face of result.faces) {
        const uniqueVerts = new Set(face);
        if (uniqueVerts.size < face.length) {
          duplicateVertCount++;
        }
        if (face.length === 3) {
          // Simple degenerate check: same vertex repeated
          if (face[0] === face[1] || face[1] === face[2] || face[0] === face[2]) {
            degenerateCount++;
          }
        }
      }
      console.log(`\n    Degenerate faces (repeated vertex in triangle): ${degenerateCount}`);
      console.log(`    Faces with duplicate vertices: ${duplicateVertCount}`);
      
      // Vertex index range check
      const numVertices = result.vertices.length / 3;
      let outOfRangeCount = 0;
      for (const face of result.faces) {
        for (const idx of face) {
          if (idx < 0 || idx >= numVertices) {
            outOfRangeCount++;
          }
        }
      }
      console.log(`    Out-of-range vertex indices: ${outOfRangeCount}`);
    }
    
    if (result.vertices && result.vertices.length > 0) {
      // Vertex stats
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
      
      // First 5 vertices
      console.log(`\n    First 5 vertices (x,y,z):`);
      for (let i = 0; i < Math.min(5, numVerts); i++) {
        const idx = i * 3;
        console.log(`      V${i}: (${result.vertices[idx].toFixed(4)}, ${result.vertices[idx+1].toFixed(4)}, ${result.vertices[idx+2].toFixed(4)})`);
      }
    }
    
  } catch (err) {
    console.log(`\n!!! EXTRACTION FAILED !!!`);
    console.log(`  Error: ${err.message}`);
    console.log(`  Stack: ${err.stack}`);
  }
}
