# v0.4.9 — Parasolid node stream and the remaining unknowns

Opened 2026-09-21. Working brief.

> **EXP-063 checkpoint:** [Independent STEP bounds comparison](../knowledge/evidence/2026-09-21_v0.4.9-EXP063.md). Stored whole-model bounds agree within 1 nm on 23/24 SW2022 models. C16 spline loft has about 10.365 micrometres of enlargement on every side; universal tightness is not supported. C15/C17 torus bounds outperform mesh bounds. Full scripts/results committed; next number EXP-064, subject to concurrent staging updates.

> **EXP-062 audit checkpoint, 2026-09-21:** [Independent evidence and handoff](../knowledge/evidence/2026-09-21_v0.4.9-EXP062.md). EXP-059–061 reproduced with checkout-path relocation. A fresh walker confirms Block2 on 11,515 strips and the bounding layout on 1,414 faces; an independent OLE reader confirms 25 legacy partition wrappers. Exact analytic bounds and the post-Z field's meaning remain unproven. The modern face-count delta does not generalize to SW2011. Bounding bytes 12–91 are decoded; unknown ranges are 0–11 and 92–131. Scripts and hashed results are under this directory. Next: external exact-bound comparison, legacy DisplayLists, and node framing. Next experiment number at this checkpoint: EXP-063; recheck staging for concurrent work.

> **EXP-058 checkpoint, 2026-09-21:** [Evidence and handoff](../knowledge/evidence/2026-09-21_v0.4.9-EXP058.md). Across 24 SW2022 export pairs, the contiguous declaration prefix has 13 entries (312 matched), ending at `Z` at PS-relative byte 349. Embedded partitions have 8 initial declarations. The old text scanner's 19 matches include later declarations; they are not one contiguous initial table. Binary stored flag word 1 versus text 0 remains uninterpreted. Next: frame records after `Z`; no nodes decoded yet. Code/results are saved under this directory. The original working brief below is retained with this correction.


The previous version line (v0.4.8, EXP-042–051) closed the DisplayLists geometry layer. v0.4.9
goes after what is left: the **Parasolid node stream**, the **two unidentified surface tags**,
and the **legacy container**.

---

## Where things stand

Read these first, in this order:

| file | why |
|---|---|
| `knowledge/CONTAINER_AND_STREAMS.md` | what the container holds and what is already verified |
| `knowledge/KNOWN_INVARIANTS.md` | INV-020 … INV-025, the spine |
| `knowledge/NEXT_QUESTIONS.md` | NQ-030, NQ-035, NQ-037 … NQ-040 are live |
| `parasolid/v0.1/README.md` | how far the XT reader gets |
| `knowledge/PRIOR_ART.md` | what others claim. **Not evidence** — hypotheses only |

Decoded so far: the DisplayLists per-face record end to end (strip lengths, positions, normals,
Block1 edge IDs, Block2 section lengths, Block3, forward metadata), surface tags 4001–4006, the
container stream map with per-stream CRC-32, and the Parasolid transmit header and schema table.

Not decoded: any Parasolid node. No entity, surface, curve or coordinate has been read out of
`Contents/Config-0-Partition`.

## The corpus is the whole advantage here

`test files new/SW2022` has 24 models, each shipping the **same body five ways**:

```
model.SLDPRT   the embedded partition we want to read
model.step     surface type per face, externally produced
model.STL      mesh cross-check
model.x_t      Parasolid TEXT transmit  <- the lever
model.x_b      Parasolid BINARY transmit
```

`model.x_t` and `model.x_b` are the same body in two encodings. So a binary decode can always be
checked against an independently produced text encoding rather than against expectations. That
is how the header and schema table were settled (EXP-056), and it is how the node stream should
be settled too.

`BUILD_LOG.md` states SolidWorks' own per-face surface type for every model. `test files
new/SW2011` has 25 more in the legacy container, geometry-matched to the 2022 set.

Start with `C00_cube_10mm`. Six planes, twelve edges, eight vertices, and we know every
coordinate: the cube occupies [0,10]³ with a corner at the origin. Anything the decoder produces
is immediately checkable against numbers we already know.

---

## Targets, in the order they unblock each other

### 1. Finish the schema table (small, unblocks the rest)

`parasolid/v0.1` stops after 7 entries where the text form has 19, consistently at byte 228 in
every `.x_b`. The text shows why: entries past `index_map_offset` carry an extra trailing field —
`index_map_offset0 0 1 d` before `A9 index_map82 0` — so the fixed `code`/`flag` pair does not
describe them.

Also unresolved: the 9-byte preamble between the schema string and the first entry
(`00 e6 00 00 00 00 00 65 13` in partitions, `… 00 0c 23` in `.x_b`). Currently kept raw.

### 2. Locate and frame the node stream

Where the nodes begin, how a node is delimited, and how node references resolve. Milestone is
deliberately **enumeration without interpretation**: node types and counts, no fields resolved.
For the cube that number is checkable — the text form spells out the same body.

### 3. Read the analytic surfaces

Plane, cylinder, cone, sphere, torus are simple fixed structures. Success criterion for C00 is
exact: six planes whose normals and offsets reproduce a 10 mm cube at the origin. For `C13_cone`,
base radius 5 and height 10. For `C15_torus`, major 5 and minor 2. These are not tolerances to
negotiate — the models were built to those numbers.

Watch the units trap: DisplayLists is **metres**, STEP and STL are **millimetres**. Confirm which
the partition uses rather than assuming.

### 4. Tags 4007 and 4009 (NQ-030)

Unidentified, and they occur nowhere in either corpus, so no analysis of current files can settle
them — this needs new models. Untested surface types: surface of revolution with a non-circular
profile, sweep along a spline, offset surface, ruled surface, blends other than a simple fillet
torus. Build them the way C13–C16 were built: one bare primitive per model, nothing else.

### 5. Legacy OLE2 (NQ-038)

All 25 SolidWorks 2011 models are rejected as unsupported. The corpus is geometry-matched to the
2022 set, so each question is a direct comparison: does legacy DisplayLists use the same per-face
record grammar? The same tag numbers? Are Block1 edge annotations present? C22/C25/C26 match
C00/C13/C04.

### 6. Two parser defects already diagnosed

- **NQ-039** — `parser/v0.2` gates the whole metadata record on INV-023's edge-ID
  correspondence, so an empty edge table discards a valid surface tag. Seen on
  `C23_cube_sw2011_to_2022`. Separate "table empty" from "table disagrees".
- **NQ-040** — the container CRC-32 is verifiable (1730/1730) but never checked. Note that a
  6-byte signature swept across a file yields false positives; 1,465 spurious hits in this
  corpus. Separate them by name plausibility or you will report phantom failures.

---

## House rules

These are not bureaucracy; every one of them exists because something went wrong without it.

1. **Claims need evidence, in-repo and reproducible.** A script under `knowledge/scripts/` or
   `evidence/scripts/`, the corpus size, the exact command. See `EVIDENCE_PRESERVATION_POLICY.md`.
2. **State the corpus with every number.** "0 exceptions" means nothing without "across N files,
   M faces". A bounded negative is a real result; an unbounded one is not.
3. **Separate what is verified from what is inferred.** Say which. "Readable" is not "decoded" —
   the partition was readable for a whole experiment before a single node was read.
4. **A decoder that returns something plausible is more dangerous than one that throws.** The
   text-schema parser in EXP-056 silently returned 5 entries instead of 19, missing exactly the
   geometry-bearing ones, and looked like a clean parse. Only the cross-check caught it. Prefer
   loud failure and report where you stopped.
5. **Try the cheap thing before recording something as opaque.** `Config-0-Partition` sat marked
   unreadable for months because high entropy was read as a conclusion instead of "it is
   compressed".
6. **Don't adopt outside claims.** `PRIOR_ART.md` is a list of hypotheses. Three we tested came
   out against the source. Test on our corpus or leave it alone.
7. **Branches:** work goes to `staging`. Two agents push here, so rebase rather than force, and
   renumber on experiment-number collisions (this has already happened once, EXP-052).

## Numbering

Next experiment number is **EXP-059**. EXP-058 is the declaration-prefix checkpoint linked above. Taken: EXP-042–051 (v0.4.8), EXP-052 (concurrent session),
EXP-053 (converter), EXP-055 (tag identification), EXP-056 (Parasolid header), EXP-057
(independent verification). EXP-054 was withdrawn and its content now lives in
`knowledge/CONTAINER_AND_STREAMS.md` and `knowledge/PRIOR_ART.md`.
