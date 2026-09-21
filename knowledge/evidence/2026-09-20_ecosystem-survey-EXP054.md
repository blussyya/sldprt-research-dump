# EXP-054 — Ecosystem survey and external-claim verification

Date: 2026-09-20
Scope: fourteen third-party SLDPRT / Parasolid projects plus the historical
record, surveyed for (a) method, (b) provenance of each format claim, and
(c) points of agreement or conflict with our invariants.

Survey reports are working notes and are not evidence. Everything recorded
as a finding below was re-tested locally against our own 24-file corpus
(21 modern, 3 legacy OLE2). Scripts are preserved under `scripts/` beside
this file.

---

## 1. The headline: `Contents/Config-0-Partition` is readable

**Our prior claim, now falsified.** The README and INV-001 notes describe
`Contents/Config-0-Partition` as high-entropy and unread. The entropy
measurement was correct (H = 7.93–8.00 bits/byte raw) but the conclusion
drawn from it was wrong.

The stream carries a 28-byte header, after which it is ordinary zlib.
Inflating past it drops entropy to H = 4.26–6.68 and exposes an ASCII
banner as the first bytes:

```
PS...?: TRANSMIT FILE (partition) created by modeller version 3301247
SCH_3301247_33103_13006
```

This is a Parasolid XT transmit file — the native B-rep.

| check | result |
|---|---|
| modern files probed | 21 |
| inner zlib member inflated | **21 / 21** |
| `TRANSMIT` banner present | **21 / 21** |
| section magic at offset 4 constant | **21 / 21** |

Section magic, verbatim: `23 1d d5 71 da 81 48 a2 a8 58 98 b2`.
This independently confirms the section magic documented by solid-diff
(CosmicFrontierLabs), on a corpus that is not theirs.

**Schema identifiers.** Five modeller variants, one base schema:

| schema | files |
|---|---|
| `SCH_3301247_33103_13006` | 15 |
| `SCH_3501251_35102_13006` | 2 |
| `SCH_3101290_31100_13006` | 2 |
| `SCH_3401247_34101_13006` | 1 |
| `SCH_3201230_32001_13006` | 1 |

Every one terminates in `13006`. Per the 2006 UGS *Parasolid XT Format
Reference*, later schema versions are encoded as deltas patched against a
stated base, so this is one base schema to solve rather than five.

Reproduce: `scripts/probe-partition.js`.

**What this does not establish.** That the stream inflates and announces
itself as Parasolid is not the same as decoding it. No node has been read.
The schema-acquisition problem (§4) is untouched by this finding.

---

## 2. Container stream inventory

Decompressing the modern container yields 37–48 named streams per file.
Recorded in full by `scripts/list-stream-names.js`; the load-bearing rows:

| stream | files |
|---|---|
| `Contents/DisplayLists` | 21 / 21 |
| `Contents/Config-0-Partition` | 21 / 21 |
| `Config-0-FeatureBodies/LocalBodies` | **1 / 21** |

solid-diff documents `Config-N-FeatureBodies/LocalBodies` as a Parasolid
target alongside `Config-N-Partition`. In our corpus that path occurs in a
single file (`PTC GE8080-8.SLDPRT`). Their reported 99.0% success over a
1536-file PDM vault is consistent with a corpus far more uniform than ours.
`Config-0-Partition` is the universal route here.

### 2.1 DisplayLists format version tag (new)

The container carries an explicit version-tagged stream we have never read:

| tag | files |
|---|---|
| `_DL_VERSION_13000` | 2 |
| `_DL_VERSION_14000` | 1 |
| `_DL_VERSION_15000` | 15 |
| `_DL_VERSION_16000` | 1 |
| `_DL_VERSION_17000` | 2 |

Our parser treats the DisplayLists format as monolithic. It has in fact
been validated across five declared format versions without ever consulting
the declaration. That our invariants hold across all five is a strengthening
result, not a weakening one — but the parser should read this tag rather
than continue to be right by accident. Filed as NQ-034.

---

## 3. Independent corroboration of our invariants

cadmpeg's `docs/formats/sldprt.md` (1,773 lines) and XRTC5/sldprt-export
were both developed without reference to this project — neither repository
contains any occurrence of `blussyya`, `sldprt-format-research` or
`sldprt-research-dump`, and no unattributed reuse of our findings was
located in either.

Both independently state the structure recorded in INV-020 / INV-018:

- the same six-array face-record table order
- `V = sum(L)` over strip lengths
- `Block2[i] = 2·L[i] − 2`
- the same triangle-count formula
- alternating-winding strip decode (sldprt-export)
- metres in DisplayLists, millimetres on export (sldprt-export)

Three independent derivations of `Block2[i] = 2L[i] − 2` is the strongest
external support any of our invariants has. Note that this corroborates the
**corrected** form of INV-020, not the earlier incorrect attribution of
vertex counts to Block2.

---

## 4. Conflicts and open external claims

### 4.1 Block1 element type — active disagreement

cadmpeg's spec describes the Block1 array as "List B contains finite f32
values". INV-021 holds that Block1 is `u32` edge-ID tokens (0 = interior,
nonzero = shared boundary ID).

We consider our reading better supported: it rests on a falsification
control in which shuffling edge order produces 44,640 exceptions, whereas a
finiteness test barely discriminates — small integers reinterpreted as f32
are finite in the overwhelming majority of cases. cadmpeg offers no
falsification control for the float reading.

This is now a *named external disagreement* rather than an unexamined
assumption, and is recorded as such. It is not resolved by our preferring
our own answer.

### 4.2 Face records with zero normals — unfalsified, not refuted

sldprt-export's code explicitly permits a face record carrying zero normals
entries. Our parser requires `normals.count === positions.count` and would
reject such a record.

Tested (`scripts/reject-scan.js`): **21 files, 1,272 faces accepted, 0
records rejected.** The case does not occur anywhere in our corpus.

This does not refute their claim. Our corpus is 21 curated files; theirs is
not. Absence here is weak evidence about the wild. Filed as NQ-035.

### 4.3 cadmpeg AL-03 — extended tessellation header

cadmpeg's open-items document describes an "extended" per-face
tessellation-table header form carrying a nonzero token in a slot we have
only ever observed at a fixed value. Not yet tested here. Filed as NQ-036.

---

## 5. Provenance map

Classification per the survey brief: **(A)** independently verified against
real files with fixtures, corpora or reproducible scripts; **(B)** inherited
from a named upstream; **(C)** asserted without support.

| project | method | provenance | license |
|---|---|---|---|
| cadmpeg | Parasolid B-rep primary, DisplayLists secondary | ~0 (A) *in the document* — no hexdumps, no named files, no bibliography, 0 citations. Evidence likely exists in unreadable Rust golden tests | docs CC BY 4.0, code Apache-2.0 |
| solid-diff | Parasolid XT via `Config-N-Partition` | ~20–25 (A), ~25–30 (B) explicitly cited, ~10–15 (C) mostly self-flagged. Per-claim confidence markers | **unconfirmed** — no LICENSE found |
| sldprt-export | DisplayLists, + assemblies, STL/3MF | transparently (B); credits cadmpeg by URL | MIT |
| sldprt2step | genuine Parasolid B-rep → STEP, pure stdlib | source-verified (A) for mechanism | Apache-2.0 |
| openswx | container + metadata only | (A) within its narrow scope | MIT |
| swformat | metadata/sketches; geometry a stated non-goal | (A), no overlap with us | Apache-2.0 |
| sldprt2xt | claims verbatim X_T transcription | (C) — extraction mechanism unverified | AGPL-3.0 |
| step_converter | partition forensics; *not* a STEP converter | (C); own README disclaims validated conversion | none stated |
| parasolid-kit | XT B-rep, Rust/Python | (A); refuses to ship Siemens catalogs | MIT + Apache-2.0 |
| ps-parser | schema-aware X_B → node graph | (B); ships `sch_13006.s_t` of undocumented provenance | MIT (asset provenance unresolved) |
| xt-parser | XT research, WIP | (C) publicly | **none** — all rights reserved |

### 5.1 Ancestry

The Parasolid half of this ecosystem descends from a single document: the
*Parasolid XT Format Reference*, October 2006, © UGS Corp., marked
proprietary, mirrored rather than officially released. It documents the
node/index model, pointer resolution, variable-length node encoding, the
V13→V14+ delta-schema algorithm, and field tables for PLANE / CYLINDER /
CONE / SPHERE and the topology entities. None of the four Parasolid
projects cites it or each other; the inheritance is structural.

The SLDPRT container half traces to openswx. The *briefing assumption that
openswx is also the geometry-layer ancestor is not supported*: no mention of
DisplayLists, triangle strips or Parasolid partitions was found in its
README.

The historical root is Bryan Bishop (heybryan.org, pre-2015), who named the
stream — *"It usually has a name like Contents/DisplayLists__ZLB"* — and
explicitly decoded nothing: *"I haven't been able to figure that out yet."*
The `__ZLB` suffix is legacy-era; it occurs in **0 / 24** of our files, in
raw bytes or in the decompressed directory. Our stream name is read from the
modern container directory, where `Contents/DisplayLists` is present 21 / 21.
It is verified, not inherited.

### 5.2 Citation of this project

solid-diff's `REFERENCES.md` cites `blussyya/sldprt-format-research` twice,
marked "(verified)":

> Has decoded the Contents/DisplayLists face-block layout (vertex positions
> + normals confirmed across 595 faces); triangle index decoding still
> unsolved.

Accurate at their compile date (2026-07). Now stale: INV-020 (EXP-042–049)
closed exactly the gap cited as unsolved. Their characterisation of
`Config-0-Partition` as undecoded in our project was also accurate — and is
superseded by §1 of this document.

No uncited use of our work was found in any surveyed repository.

---

## 6. Modern/legacy discriminator (new, verified)

From the PRONOM trail (fmt/1967; the registry's own signature tab was
unreachable, candidate bytes came via a SolidWorks forum thread):

| claim | modern | legacy OLE2 |
|---|---|---|
| bytes 4–7 = `00 00 00 04` | **21 / 21** | 0 / 3 |
| sequence `34 f6 e6 47 56 e6 47 37 f2` present | **21 / 21** | 0 / 3 |

Bytes 0–3 are distinct in all 21 modern files, so the discriminator sits at
offset 4, not 0. First occurrence of the 9-byte sequence varies (offset
39–614), so it is a membership test, not a fixed-offset signature.

Reproduce: `scripts/verify-external-claims.js`.

---

## 7. What remains unclaimed

Surface tags 4001 / 4002 / 4003 and the unvalidated 4005 / 4006 / 4007 /
4009 appear in **no** surveyed project — zero occurrences across the whole
ecosystem. cadmpeg and solid-diff both resolve face identity by geometric
fit against the B-rep or by persistent-ID string matching
(`ATOM_ID_2001` / `SurfIdRep`), never by numeric tag.

NQ-030 therefore has no external answer waiting, and the tag decode remains
this project's own territory. The same holds for the Block1 edge-ID
semantics of INV-021 and the boundary-cycle topology of INV-024:
sldprt-export reads that same array as an opaque length-checked "extras"
table.

A useful negative result from solid-diff: Parasolid's `FACE_ID_2001` does
not survive edits, which drove them to geometric matching. If persistent IDs
do not survive edits on the B-rep side, our Block1 edge-ID tokens likely do
not either, and edit-tracking work should target adjacency and geometric
matching rather than ID persistence.

---

## 8. Filed questions

- **NQ-034** — read `_DL_VERSION_*`; confirm whether record layout varies
  across 13000–17000 or the tag is advisory only.
- **NQ-035** — construct or obtain a part exhibiting a zero-normals face
  record; decide whether to accept or continue rejecting.
- **NQ-036** — scan the corpus for cadmpeg's extended tessellation-table
  header (AL-03).
- **NQ-037** — enumerate node types and counts in the inflated
  `Config-0-Partition` without resolving fields, as the first milestone of
  any B-rep work.

## 9. Prompt-injection check

All fetched third-party content was treated as untrusted data. No
instructions addressed to an automated agent were found in any surveyed
repository. One benign housekeeping note addressed to human contributors
was observed in cadmpeg's open-items document and not acted upon.
