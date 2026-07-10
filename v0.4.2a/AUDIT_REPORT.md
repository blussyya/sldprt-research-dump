# v0.4.2a Audit Report

**Date:** 2026-07-10
**Objective:** Evaluate four reviewer criticisms. Attempt to falsify. Produce evidence only.

---

## Audit 1: Parser Filtering May Introduce Circular Validation

### Finding: CONFIRMED. Two filters are circular.

The extraction pipeline applies 10 filtering steps before accepting a face. Two of these check structural properties that are also invariant claims:

| Filter | What it checks | Invariant it pre-assumes |
|--------|---------------|--------------------------|
| F8_B1_HEADER_MAGIC | Block 1 header bytes at block1Start are `[4, 8, 2, N]` | **INV-005** |
| F11_B2_HEADER_MAGIC | Block 2 header bytes at b2Start are `[4, 8, 2, M]` | **INV-006** |

**Impact:** Every face that reaches the invariant tests already satisfies INV-005 and INV-006 by construction. The invariant tests for INV-005 and INV-006 are therefore tautological -- they can never fail on accepted faces.

### Full Candidate Funnel (all 8 files)

| Stage | Filter | BOTTOM | TOP | GEAR | DEKOR | HEADPHONE | DISTRIBUTOR | POCKET | PTC | Total |
|-------|--------|--------|-----|------|-------|-----------|-------------|--------|-----|-------|
| Markers | — | 156 | 272 | 452 | 1500 | 248 | 204 | 1600 | 504 | 4936 |
| F2 | edgeCount range | 78 | 136 | 226 | 750 | 124 | 102 | 800 | 252 | 2468 |
| F4 | vertexCount range | 39 | 68 | 113 | 377 | 62 | 51 | 400 | 126 | 1236 |
| F8 | B1 header magic | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Accepted | — | 39 | 68 | 113 | 373 | 62 | 51 | 400 | 126 | 1232 |

- F8_B1_HEADER_MAGIC rejected **0 faces** across all files. Every candidate that passes the float and bounds checks also happens to have `[4, 8, 2, ?]` at the Block 1 position.
- F2 (edgeCount) and F4 (vertexCount) are the dominant rejection filters. They reject false-positive marker matches where `[12, 0, 0, 0, 100, 0, 0, 0]` appears coincidentally in non-face data.

### Assessment

F8 and F11 are **logically circular** for INV-005 and INV-006. However, they are **not circular** for the other invariants (INV-007 through INV-018), which are tested on data that was not pre-validated by those specific filters. The circularity means:

- INV-005 and INV-006 are **unfalsifiable** by this pipeline. They cannot be tested.
- INV-007 through INV-018 are **not affected** by this circularity. They are tested on structural data (Block 1 body, Block 2 body) that the pipeline reads but does not validate against the invariant's own criteria.

### What would be needed to test INV-005 and INV-006

An extraction pipeline that does **not** filter on Block 1/2 header magic. Accept any marker match, read whatever bytes are at theputed Block 1/Block 2 positions, and then test whether the headers are `[4, 8, 2, N]`. This would produce many false positives but would be the only way to falsify INV-005 and INV-006.

---

## Audit 2: Two DEKOR Faces Failed v0.4.0 Validation

### Finding: Detection error. The 2 faces are genuine and satisfy all invariants.

**Root cause:** The 2 faces have `vertexCount = 5862`. The v0.4.0 parser uses `vertexCount > 5000` as a filter, rejecting them. Earlier experiments (EXP-004, EXP-007, v0.3.5 scripts) used `vertexCount > 10000`, which accepted them.

**Evidence:**

| vc limit | DEKOR face count | Source |
|----------|-----------------|--------|
| vc <= 5000 | 373 | v0.4.0, v0.4.2, v0.4.2a |
| vc <= 10000 | 375 | v0.3.5 forensic_grammar.js, grammar_reconstruct.js |

**The 2 extra faces:**

| Marker offset | vc | ec | Passes all invariants? |
|---------------|-----|-----|----------------------|
| `0x2636` | 5862 | 9 | **YES** (INV-008/009/010/016/017/018 all pass) |
| `0x35d7d` | 5862 | 9 | **YES** (same structural signature) |

**Byte-level trace (face at marker@0x2636):**

```
marker offset:  0x2636
face start:     0x2632 (edgeCount field)
edgeCount:      9
gap:            [12, 100, 2, 5862]     (INV-004: PASS)
B1 header:      [4, 8, 2, 9636]        (INV-005: PASS -- but unfalsifiable, see Audit 1)
B1 length (N):  9636
sectionCount:   1044
B2 header:      [4, 8, 2, 1044]        (INV-006: PASS -- but unfalsifiable, see Audit 1)
B2 values:      [4, 4, 4, ..., 12, ...] (range: 4..44, 19 distinct values)
B2 sum:         9636

INV-008 (starts with ONE): PASS
INV-009 (ONE count == b2 count): PASS (1044 == 1044)
INV-010 (no consecutive ONEs): PASS
INV-016 (b1len == 2*(vc - secs)): PASS (9636 == 2*(5862 - 1044) == 9636)
INV-017 (secLen == b2-1): PASS (all 1044 sections verified)
INV-018 (sum(b2) == b1len): PASS (9636 == 9636)
```

**All 6 testable invariants pass.** The 2 vc=5862 faces are genuine, valid faces. They satisfy every invariant that is not pre-assumed by the extraction pipeline.

---

## Audit 3: Mathematical Independence of INV-018

### Finding: INV-018 is NOT mathematically independent. It follows from INV-017.

**Proof:**

1. By construction of section splitting: `sum(sectionLen) = b1len - secs`
   (The ONEs are removed from the body; sections are the non-ONE tokens.)

2. From INV-017: `sectionLen[i] = b2[i] - 1` for all i

3. Substituting (2) into (1):
   `sum(b2[i] - 1) = b1len - secs`
   `sum(b2) - secs = b1len - secs`
   `sum(b2) = b1len`

4. This is exactly INV-018. QED.

**Empirical verification:**

| Metric | Count |
|--------|-------|
| Faces where INV-017 passes | 1232 |
| Faces where INV-018 also passes | 1232 |
| Faces where INV-017 passes but INV-018 fails | **0** |

INV-018 adds zero independent information beyond INV-017. It is a mathematical consequence, not an independent invariant.

---

## Audit 4: Re-examine INV-012

### Finding: Documentation mistake. The formula is off by +1.

**INV-012 documents:**
```
len = 2 * loopSize - 2
```
Where `loopSize = (raw + 2) / 2` (from INV-007).

Substituting:
```
len = 2 * ((raw + 2) / 2) - 2 = raw + 2 - 2 = raw
```

So INV-012 predicts `sectionLen = raw`.

**INV-017 documents:**
```
sectionBodyTokenCount = Block2[i] - 1
```

So INV-017 predicts `sectionLen = raw - 1`.

**Corpus verification (8,763 sections across 8 files):**

| Formula | Matches | Rate |
|---------|---------|------|
| `len = raw` (INV-012) | **0** | 0.0% |
| `len = raw - 1` (INV-017) | **8763** | 100.0% |
| Neither | 0 | 0.0% |

**Root cause:** The documented formula `len = 2 * loopSize - 2` should be `len = 2 * loopSize - 3`. The `-2` should be `-3`. This is a **documentation mistake** (off-by-one in the constant), not a terminology mismatch or experimental contradiction.

The correct relationship is:
```
len = 2 * loopSize - 3
```
Which is algebraically equivalent to `len = raw - 1` (INV-017).

---

## Summary

| Audit | Finding | Severity |
|-------|---------|----------|
| 1. Circular validation | CONFIRMED: F8 and F11 pre-assume INV-005 and INV-006. These invariants are unfalsifiable by current pipeline. | Medium -- affects 2 invariants only |
| 2. Two DEKOR faces | Detection error: vc=5862 faces rejected by arbitrary vc<=5000 filter. Earlier scripts used vc<=10000. | Low -- filter threshold, not a bug. **Requires re-verification of INV-016/018 for these faces.** |
| 3. INV-018 independence | CONFIRMED: INV-018 is a mathematical consequence of INV-017, not independent. | Low -- redundancy, not an error |
| 4. INV-012 discrepancy | Documentation mistake: formula off by +1. Correct constant is -3, not -2. | Low -- documentation only |

### Open item

~~The vc=5862 faces require re-verification. The initial trace suggests INV-016 and INV-018 may be contradictory for these faces (b1len=9636 but sum(b2)=4176). This could indicate a block2 parsing error for very large faces, or the block2 data may be structured differently for faces with vc > 5000.~~

**Resolved:** The vc=5862 faces pass ALL invariants. The earlier concern was based on incorrect B2 value reading (assumed all entries were 4; actual values range 4..44 with sum=9636=b1len). No block2 parsing error exists.
