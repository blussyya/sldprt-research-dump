# v0.4.4 Summary: Serialization Structure Investigation

**Date:** 2026-07-16
**Objective:** Understand the serialization format itself, not improve the parser or converter.

## Experiments

### EXP-022: Global Container Survey
- **Result:** 3,516 [4,8,2,N] patterns found across 7 files
- **Key Finding:** N values range from 1 to 9,636 (173 distinct values)
- **Density:** 0.96 patterns per 1KB average

### EXP-023: Alternative Header Characterization
- **Result:** 661/1,172 faces (56.4%) have alternative headers
- **Key Finding:** VC=4,8,10 faces always have alternatives (100% rate)
- **N Distribution:** N=1 (55.7%), N=2 (44.3%)

### EXP-024: Rejected Candidate Audit
- **Result:** All 4,688 candidates fail validation
- **Key Finding:** Validation logic is too strict for raw data analysis
- **Categories:** INVALID_EC (50.0%), INVALID_B2 (25.0%), INVALID_VC (25.0%)

### EXP-025: Serialization Primitive Frequency
- **Result:** 3,516 patterns with 173 distinct N values
- **Key Finding:** 53.7% of patterns have N ≤ 10
- **Density:** PTC (2.23/1KB) highest, GEAR (0.63/1KB) lowest

## Key Insights

1. **The [4,8,2,N] pattern is pervasive** - 3,516 occurrences across 7 files
2. **N values are diverse** - 173 distinct values from 1 to 9,636
3. **Alternative headers are common** - 56.4% of faces have them
4. **VC=4,8,10 faces always have alternatives** - 100% correlation
5. **Validation logic needs relaxation** - raw data contains more candidates than parser recognizes
6. **Multiple container families likely exist** - N ranges suggest different types

## Facts

1. 3,516 [4,8,2,N] patterns found (0.96 per 1KB)
2. N values: 1-9,636 (173 distinct)
3. 661/1,172 faces have alternative headers (56.4%)
4. VC=4,8,10 faces: 100% alternative rate
5. N=1: 55.7%, N=2: 44.3% of alternatives
6. PTC density: 2.23/1KB (highest)
7. GEAR density: 0.63/1KB (lowest)

## Hypotheses

1. [4,8,2,N] is a generic serialization container
2. N represents container size or element count
3. Multiple container families exist
4. Alternative headers are optional face properties
5. The format uses nested/chained containers

## Unknowns

1. What does N represent in each context?
2. How are containers nested or chained?
3. What determines N value for each container?
4. Why does PTC have high density?
5. What is the container body structure?
6. How do containers relate to face topology?
7. Are there other serialization primitives?

## Files Created

- `v0.4.4/exp022_global_container_survey.js`
- `v0.4.4/exp023_alternative_header_characterization.js`
- `v0.4.4/exp024_rejected_candidate_audit.js`
- `v0.4.4/exp025_serialization_primitive_frequency.js`
- `v0.4.4/EXP022_RESULTS.json`
- `v0.4.4/EXP023_RESULTS.json`
- `v0.4.4/EXP024_RESULTS.json`
- `v0.4.4/EXP025_RESULTS.json`
- `knowledge/evidence/2026-07-16_v0.4.4-EXP022.md`
- `knowledge/evidence/2026-07-16_v0.4.4-EXP023.md`
- `knowledge/evidence/2026-07-16_v0.4.4-EXP024.md`
- `knowledge/evidence/2026-07-16_v0.4.4-EXP025.md`
