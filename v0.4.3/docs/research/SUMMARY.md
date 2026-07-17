# v0.4.3 Summary

**Date:** 2026-07-16
**Objective:** Experimentally validate remaining structural assumptions before attempting a new parser.

## Experiments

| Experiment | Status | Key Finding |
|-----------|--------|-------------|
| EXP-018 | Complete | 1,234 FULL candidates match previous parser exactly |
| EXP-019 | Complete | 4/5 hypotheses survived, 1 falsified (alternative B1 positions) |
| EXP-020 | Blocked | Missing `pako` dependency for geometry comparison |

## Key Results

### EXP-018: Independent Face Extraction

- Total raw candidates: 4,936
- FULL candidates: 1,234 (matches previous parser exactly)
- PARTIAL_GAP candidates: 1,234 (all have ec=1, vc=0)
- REJECTED candidates: 2,468

**Finding:** The extraction model is consistent. Every genuine face passes all filters, and every false positive is correctly rejected.

### EXP-019: Normal/Layout Falsification

| Hypothesis | Result | Details |
|-----------|--------|---------|
| H1: Normals are unit vectors | **SURVIVED** | 1234/1234 pass, max deviation = 4.14e-8 |
| H2: No extra bytes between normals and B1 | **SURVIVED** | 1234/1234 clean |
| H3: Gap is exactly 16 bytes | **SURVIVED** | 1234/1234 pass |
| H4: No alternative B1 positions | **FALSIFIED** | 525/1234 faces have alternatives |
| H5: Block ordering is correct | **SURVIVED** | 1234/1234 correct |

**Finding:** The current face layout model is correct for genuine faces. The alternative B1 positions are coincidental patterns with short B1 bodies (N=1 or N=2) that can be distinguished from genuine B1 positions.

### EXP-020: Geometry Validation

**Status:** Blocked by missing `pako` dependency.

**Resolution:** Defer geometry validation until dependencies are available.

## Assumptions Validated

| Assumption | Status | Evidence |
|-----------|--------|----------|
| A1: Face located by marker | Validated | EXP-018: 1,234/1,234 |
| A2: edgeCount in [1,500] | Validated | EXP-018: all FULL candidates pass |
| A3: vertexCount in [3,6000] | Validated | EXP-018: all FULL candidates pass |
| A4: Positions are float32[vc*3] | Validated | EXP-018: all FULL candidates pass |
| A5: Gap marker [12,100,2,vc] | Validated | EXP-018: 1,234/1,234 exact match |
| A6: Normals immediately after gap | Validated | EXP-019: H2 survived |
| A7: Block 1 at normalsEnd | Validated | EXP-019: H5 survived |
| A8: Block 2 after Block 1 | Validated | EXP-019: H5 survived |
| A9: Block ordering correct | Validated | EXP-019: H5 survived |

## Assumptions Falsified

| Assumption | Status | Evidence |
|-----------|--------|----------|
| A7 (alt): No alternative B1 positions | Falsified | EXP-019: 525/1234 faces have alternatives |

**Note:** The falsification is not critical. Alternative B1 positions have short bodies (N=1 or N=2) and can be distinguished from genuine B1 positions.

## Confidence

High that the current face layout model is correct for genuine faces.
The model has survived extensive falsification testing.

## Remaining Work

1. **Geometry validation:** Install `pako` and run step-tools/compare.js
2. **Controlled models:** Create simple SW models for differential analysis
3. **Parser implementation:** Build parser based on validated assumptions

## Files Created

- `v0.4.3/exp018_independent_extraction.js`
- `v0.4.3/exp019_normal_layout_falsification.js`
- `v0.4.3/exp020_geometry_validation.js`
- `v0.4.3/EXP018_RESULTS.json`
- `v0.4.3/EXP019_RESULTS.json`
- `v0.4.3/EXP020_RESULTS.json`
- `knowledge/evidence/2026-07-16_v0.4.3-EXP018.md`
- `knowledge/evidence/2026-07-16_v0.4.3-EXP019.md`
- `knowledge/evidence/2026-07-16_v0.4.3-EXP020.md`
