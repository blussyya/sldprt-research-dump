# Research Dashboard

Permanent project-wide knowledge base for the SLDPRT reverse-engineering project.

Branch-local notebooks remain under version directories such as `v0.3.5/docs/research/`. This `knowledge/` directory is the durable cross-version record.

---

## Current Research Posture

**Primary goal**: Recover the grammar of SLDPRT binary serialization well enough to build a read-only parser.

**Current phase**: DisplayLists Block 1 invariant validation and cross-file rewrite analysis (v0.4.1–v0.4.2a).

**Active research queue**: `NEXT_QUESTIONS.md`

**Rules**:

- Parser first, converter second.
- Syntax before semantics.
- Never assign semantic names without evidence.
- Every important conclusion must state status, evidence, tested files, tested counts, confidence, and date.
- Historical evidence is append-only. Do not delete old evidence; supersede it with newer entries.
- Every numerical claim must be reproducible from archived evidence.
- Open questions are broad unknowns. Next questions are concrete research queue items.
- Do not silently upgrade hypotheses into verified conclusions.
- Preserve raw experiment output under `knowledge/evidence/`.
- Git operations are only performed when explicitly instructed.

---

## High-Confidence Findings

- Modern readable geometry is in `Contents/DisplayLists`.
- Face blocks contain positions, a gap marker, normals, Block 1, and Block 2.
- The gap marker is `[12, 100, 2, vertexCount]`.
- Block 2 decodes loop vertex counts with `(raw + 2) / 2`.
- Decoded Block 2 loop counts sum to face vertex count for 595/595 tested faces.
- Block 1 starts with ONE for 595/595 tested faces.
- Block 1 ONE count equals Block 2 entry count for 1,234/1,234 tested faces.
- Block 1 ONE values are singleton runs.
- Block 1 body length follows `b1len = 2 × (vertexCount − sectionCount)` (INV-016, 1,234/1,234 validated faces).
- Every ONE-delimited section body token count equals `Block2[i] − 1` (INV-017, 8,763/8,763 sections, 1,234/1,234 faces). Independently reproduced by separate implementation (EXP-016).
- Sum of Block 2 values equals Block 1 body length (INV-018, 1,234/1,234 faces). **Note:** INV-018 is a mathematical consequence of INV-017, not an independent invariant. Retained as a derived relationship for convenience. See INV-018 dependency note.

See `KNOWN_INVARIANTS.md` for evidence details.

---

## Main Unknowns

- The exact grammar of Block 1.
- The meaning of each ONE-delimited Block 1 segment.
- The role, if any, of ZERO/ONE/VALUE token classes; VALUE semantics are currently UNKNOWN.
- Whether Block 1 is better modeled as grammar or opcode/operand bytecode.
- The meaning of DisplayLists `[1,1]` section-like structures.
- The structure of metadata streams such as LWDATA and unresolved high-entropy streams such as `Config-0-Partition`.
- Section length alone does not uniquely determine token-class sequence (only 30.2% of lengths have a single unique pattern).
- Why structurally equivalent faces require position-dependent VALUE mappings in some file pairs but only a global bijection in others (OQ-012).
- Whether the deterministic VALUE rewrite function can be expressed as arithmetic (OQ-013).

See `OPEN_QUESTIONS.md`.

---

## Active Experiments

- NQ-001: Can Block 1 be parsed by a finite-state grammar over observed section forms?
- NQ-002: Do ONE-delimited Block 1 segment lengths correlate with Block 2 loop vertex counts?
- NQ-004A: Can the property-table falsification evidence be reproduced and archived?

## Completed Experiments

- NQ-002A: `len = 2 * loopSize - 2` verification. **Answer:** Formula corrected to `len = 2 * loopSize - 3` (INV-017). Verified 8,763/8,763 sections. INV-012's original formula documented as incorrect (see correction note).
- EXP-012: Rewrite system analysis — position-dependent mapping discovered.
- EXP-013: Stress test of currently testable invariants — all survive on 1,232 faces (8 files).
- EXP-014: Reviewer criticism audit — circularity confirmed, DEKOR faces resolved, INV-018 dependency proven, INV-012 formula corrected.
- EXP-015: Non-circular validation — strengthens INV-005/006 confidence with documented remaining assumptions.
- EXP-016: Independent implementation reproducing INV-016/017/018 — 1,234/1,234 faces pass.
- EXP-017: Expanded corpus test (vc<=6000) — 2 previously-excluded DEKOR faces confirmed genuine.

See `NEXT_QUESTIONS.md`.

---

## Recently Falsified Or Corrected

- FH-003: The gap marker contains loop boundaries.
- FH-005: Normal-gap loop splitting works.
- FH-006: Face blocks start with `[12, 100, 2, vertexCount]`.
- FH-011: Block 2 raw values are vertex indices.
- FH-012: DisplayLists contains only face data.
- FH-013: VALUE tokens encode a property table.
- INV-012: Formula `len = 2 * loopSize - 2` is incorrect (off by +1). Correction appended in-place.

See `FAILED_HYPOTHESES.md` and INV-012 correction note in `KNOWN_INVARIANTS.md`.

---

## Current Corpus

| File | Short name | Notes |
| --- | --- | --- |
| `test files original/usb hub case (ultimate test)/USB hub case BOTTOM.SLDPRT` | BOTTOM | Openswx, 39 faces |
| `test files original/usb hub case (ultimate test)/USB hub case TOP.SLDPRT` | TOP | Openswx, 68 faces |
| `test files original/Helical Bevel Gear.SLDPRT` | GEAR | Openswx, 113 faces |
| `test files original/Dekor.SLDPRT` | DEKOR | Openswx, 375 faces (v0.4.0: 373 at vc<=5000; 375 at vc<=10000 — discrepancy resolved) |
| `untouched/Headphone Stand.SLDPRT` | HEADPHONE | Openswx, 62 faces. **New.** Contains MeshData stream. |
| `untouched/distributor main boss rev a.SLDPRT` | DISTRIBUTOR | Openswx, 51 faces. **New.** |
| `untouched/Pocket Wheel.SLDPRT` | POCKET | Openswx, 400 faces. **New.** Largest corpus file. |
| `untouched/PTC GE8080-8.SLDPRT` | PTC | Openswx, 126 faces. **New.** Contains FeatureBodies stream. |
| `test files original/SW2000-s01.SLDPRT` | SW2000 | OLE2, not parseable by current pipeline |
| `test files original/plate4.sldprt` | PLATE4 | OLE2, not parseable by current pipeline |
| `test files original/chainwheel.sldprt` | CHAINWHEEL | OLE2, not parseable by current pipeline |

Modern aggregate: 1,234 faces across 8 models (vc<=6000). All 17 currently testable invariants pass 100%. v0.4.0 2-face discrepancy resolved: the 2 DEKOR vc=5862 faces are genuine and pass all invariants (were excluded by an arbitrary vc<=5000 filter threshold).

---

## Repository Stewardship

Before proposing a commit:

- Review changed files and identify unrelated edits.
- Suggest logical commit boundaries.
- Identify files that should or should not be committed.
- Check for accidental debug output and generated files.
- Verify documentation matches implementation.
- Verify experiments referenced by documentation actually exist.

Commit report template:

```text
Summary:
Files changed:
Research impact:
Breaking changes:
Documentation status:
Recommended commit message:
```

---

## Maintenance Protocol

See `EVIDENCE_PRESERVATION_POLICY.md` for the mandatory evidence rules.

When adding a conclusion:

```text
Status:
Evidence:
Files tested:
Faces/models tested:
Confidence:
Date last updated:
```

When disproving a hypothesis:

1. Add or update the disproving experiment in `EXPERIMENT_LOG.md`.
2. Move the claim to `FAILED_HYPOTHESES.md`.
3. Remove or downgrade any conflicting entry in `ASSUMPTIONS.md` or `KNOWN_INVARIANTS.md`.
4. Add raw or summarized evidence under `knowledge/evidence/` when useful.

When adding a numerical claim:

1. Archive raw script output, corpus size, files analyzed, exact command/script used, and date produced.
2. Link the summary claim to the related experiment and evidence file.
3. If raw evidence is missing, explicitly record the evidence gap and add a `NEXT_QUESTIONS.md` reproduction item.

When adding a VALUE hypothesis:

1. Keep VALUE semantics at UNKNOWN unless a discriminating experiment supports the hypothesis.
2. Document at least one experiment that could distinguish the hypothesis from delimiter artifacts, frequency bias, and random-base controls.
3. Do not promote a VALUE hypothesis beyond Hypothesis without that discriminating evidence.

When adding a next question:

1. Add it to `NEXT_QUESTIONS.md`.
2. Link dependencies to experiments, assumptions, or open questions.
3. State what hypotheses it will eliminate or constrain.
4. Update `Active Experiments` here if it becomes active.

When adding a correction to an existing invariant or observation:

1. Do not delete or alter the original text.
2. Append a clearly marked correction note with the date.
3. State the old claim, the correct claim, and the evidence that justifies the change.
4. Link to the experiment and raw evidence.
5. Do not change the invariant's original status field; add a note in the correction that the status has been effectively changed.

When documenting a mathematical dependency:

1. Append a dependency note rather than deleting or downgrading the dependent entry.
2. Include the full derivation so the dependency can be checked independently.
3. State whether any counterexamples exist.
4. Retain the original entry for historical continuity.
