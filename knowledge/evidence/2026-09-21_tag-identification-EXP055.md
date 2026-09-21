# EXP-055 — Surface tag identification against SolidWorks ground truth

Date: 2026-09-21
Corpus: `test files new/` — 24 SolidWorks 2022 models and 25 SolidWorks 2011 models,
purpose-built for this question, each shipping `model.SLDPRT`, `model.step`, `model.STL`,
`model.x_t` and `model.x_b`, with a `BUILD_LOG.md` in which SolidWorks states the surface type
of every individual face.

Scripts: `scripts/EXP055/tag-join.js`, `scripts/EXP055/inspect-upgraded-metadata.js`.

---

## 1. NQ-030 resolved for four tags

**Method.** For each model, count our parsed per-face `metadata.typeTag` values and compare
against the face-type list SolidWorks reports in the build log. Where a model contains exactly
one unidentified tag and exactly one unidentified surface type at matching multiplicity, the
mapping is forced. Iterate to fixpoint, then check every face in the whole corpus against the
resulting table.

The corpus was designed so that each curved primitive is a bare single-surface model, which is
what makes the forcing step unambiguous rather than a best fit.

| tag | surface | forced by | status before | status now |
|---|---|---|---|---|
| 4001 | plane | — | verified | unchanged |
| 4002 | cylinder | — | verified | unchanged |
| 4003 | cone | `C13_cone`, 1 face | **asserted, never confirmed** | **verified** |
| 4004 | sphere | `C14_sphere`, 1 face | unknown | **identified** |
| 4005 | torus | `C15_torus`, 1 face | unknown | **identified** |
| 4006 | B-surface / parametric | `C16_loft_spline`, 4 faces | unknown | **identified** |

**Whole-corpus check: 136 faces agree, 0 disagree**, across the 22 natively-authored 2022
models. The 6 remaining faces are one model, treated in §2.

**Independent corroboration, not just forcing.** Three models were never used to derive the
table and agree with it anyway:

- `C17_torus_quarter` — a torus revolved only 90° — reports `4005×1 4001×2`. The tag tracks the
  **surface type, not the trimmed patch**: a quarter torus and a full torus carry the same tag.
- `C21_cylinder_fillet` — a cylinder with a 1 mm fillet on its top edge — reports
  `4002×1 4005×1 4001×2`. The fillet face is a torus, and the tag says torus, from a model built
  to probe trimming rather than tags.
- `C20_cylinders_crossed` — two perpendicular cylinders — reports `4002×4 4001×4`, matching
  SolidWorks exactly on a body whose cylindrical faces are trimmed by non-planar curves.

**Still unidentified: 4007 and 4009.** Neither occurs anywhere in this corpus. NQ-030 is
therefore *partially* resolved and stays open for those two. Candidate surfaces not yet
exercised: surface of revolution, swept/extruded surface along a spline, offset surface, and
blend surfaces other than the simple fillet torus.

**Face-count agreement.** Our parser found the same number of faces as SolidWorks reports on
**all 24** 2022 models, including `C18_cube_split_line` (7 faces at unchanged 1000 mm³ volume,
against C00's 6), so a split line is visible to us as a genuine face subdivision.

---

## 2. Upgraded files carry the tag but an empty edge table

`C23_cube_sw2011_to_2022` is the only 2022-set model whose faces yield no usable metadata.
It is the one file in the corpus not natively authored: a SolidWorks 2011 part opened in 2022
and resaved.

Reading the metadata record directly, bypassing `parser/v0.2`'s consistency gate:

| | `C23` (upgraded) | `C24` (2022 native) |
|---|---|---|
| surface tag | **4001, correct** | 4001 |
| metadata edge-record count | **0** | 4 |
| Block1 nonzero edge IDs | 4 per face | 4 per face |
| Block1 topology | intact — 12 distinct IDs, cube-consistent | intact — 12 distinct IDs |
| `_DL_VERSION_` | 15000 | 15000 |

So the upgrade preserves the geometry, preserves Block1's per-edge annotations, and preserves
the surface tag. What it drops is the **forward metadata edge table**, which comes back empty.

**This is a defect in our parser, not only a property of the file.** `parser/v0.2` gates the
whole metadata record on `labels == ids` (INV-023's correspondence). When the edge table is
empty that check fails, and the parser discards the *entire* metadata record — including a
surface tag that is present and correct. We lose good data as collateral damage from a
different field being empty.

Recommended change, not yet made: distinguish "edge table absent" from "edge table disagrees".
An empty table should be recorded as `edgeRecords: []` with a warning, leaving `typeTag`
readable. A *non-empty* table that disagrees with Block1 should keep failing loudly, since that
is the case INV-023 actually guards against.

**Scope limit on INV-023.** The edge-ID correspondence is verified on natively-authored modern
files. It does not hold on a file upgraded from a legacy version, where the table is empty.
INV-023 should say so rather than implying universality.

---

## 3. The 2011 set is entirely unreadable by us

All 25 SolidWorks 2011 models are legacy OLE2 containers and every one is rejected with
`Legacy OLE2 is not supported`. That is the expected, documented behaviour, not a regression.

The value is that we now hold a **controlled legacy corpus** for the first time: 25 models whose
exact geometry, volumes and per-face surface types are known, including curved primitives
(`C25_cone_sw2011_native`) and a cylindrical hole (`C26_cube_hole_sw2011_native`). Previously
our only legacy files were three uncontrolled inherited parts.

This makes legacy support a tractable target rather than a blind one, since any legacy decode
can now be checked against known answers. Filed as NQ-038.

---

## 4. Build quality

Every model's measured volume matches its specified volume. Spot checks against the figures
computed independently before the models existed:

| model | expected | measured |
|---|---|---|
| `C13_cone` | 261.799 | 261.799388 |
| `C14_sphere` | 523.599 | 523.598776 |
| `C15_torus` | 394.784 | 394.784176 |
| `C17_torus_quarter` | 98.696 | 98.696044 |
| `C19_half_cylinder` | 392.699 | 392.699082 |
| `C20_cylinders_crossed` | 2474.926 | 2474.926807 |
| `C18_cube_split_line` | 1000 (unchanged) | 1000.000000 |

`C16_loft_spline` and `C21_cylinder_fillet` were deliberately specified without a predicted
volume; they measure 739.841364 and 778.957433 mm³ respectively, now recorded.

The dataset audit reports `PASS`, 245 required files present, and confirms both Parasolid
formats exported successfully from SolidWorks 2011 as well as 2022 — so the `.x_t` text
transmit needed for NQ-037 exists for all 49 models.
