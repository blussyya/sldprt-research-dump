#!/usr/bin/env node
/**
 * EXP-020: Geometry Validation (Minimal)
 *
 * Objective: Run existing step-tools/compare.js on available files.
 *            Archive results. No new infrastructure.
 *
 * Version: v0.4.3
 * Date: 2026-07-16
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RESEARCH_DIR = 'C:/Users/basha/Desktop/soldiworks research';
const STEP_TOOLS_DIR = path.join(RESEARCH_DIR, 'step-tools');

// Available reference geometry
const COMPARISONS = [
  {
    name: 'BOTTOM',
    step: path.join(RESEARCH_DIR, 'untouched', 'USB hub case BOTTOM ORIGINAL.STEP'),
    sldprt: path.join(RESEARCH_DIR, 'test files original', 'usb hub case (ultimate test)', 'USB hub case BOTTOM.SLDPRT'),
  },
  {
    name: 'TOP',
    step: path.join(RESEARCH_DIR, 'untouched', 'USB hub case TOP.STEP'),
    sldprt: path.join(RESEARCH_DIR, 'test files original', 'usb hub case (ultimate test)', 'USB hub case TOP.SLDPRT'),
  },
];

console.log('='.repeat(70));
console.log('EXP-020: Geometry Validation (Minimal)');
console.log('Running existing step-tools/compare.js on available files');
console.log('='.repeat(70));

const results = {};

for (const comp of COMPARISONS) {
  console.log('\n--- ' + comp.name + ' ---');

  if (!fs.existsSync(comp.step)) {
    console.log('  STEP file not found: ' + comp.step);
    continue;
  }
  if (!fs.existsSync(comp.sldprt)) {
    console.log('  SLDPRT file not found: ' + comp.sldprt);
    continue;
  }

  try {
    const output = execSync(
      `node "${path.join(STEP_TOOLS_DIR, 'compare.js')}" "${comp.step}" "${comp.sldprt}" 0.5`,
      { encoding: 'utf8', timeout: 60000 }
    );
    console.log(output);
    results[comp.name] = { status: 'OK', output };
  } catch (e) {
    console.log('  ERROR: ' + e.message);
    results[comp.name] = { status: 'ERROR', error: e.message };
  }
}

// Write minimal results
const output = {
  meta: {
    version: 'v0.4.3',
    experiment: 'EXP-020',
    description: 'Geometry validation using existing step-tools',
    date: new Date().toISOString(),
  },
  results,
};

fs.writeFileSync(path.join(RESEARCH_DIR, 'v0.4.3', 'EXP020_RESULTS.json'), JSON.stringify(output, null, 2));
console.log('\nResults written to v0.4.3/EXP020_RESULTS.json');
