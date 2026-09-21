# Technical Intelligence Report: CosmicFrontierLabs/solid-diff

Compiled 2026-09-20. Fetched via WebFetch (GitHub MCP was not used because this
repository is out of scope for the session's GitHub tool access; no attempt
was made to force it). Sources fetched successfully:

- `https://github.com/CosmicFrontierLabs/solid-diff` (root, via WebFetch summary)
- `raw.githubusercontent.com/.../main/README.md`
- `raw.githubusercontent.com/.../main/docs/FORMAT.md`
- `raw.githubusercontent.com/.../main/docs/PARASOLID.md`
- `raw.githubusercontent.com/.../main/docs/BREP2MESH.md`
- `raw.githubusercontent.com/.../main/docs/STATUS.md`
- `raw.githubusercontent.com/.../main/REFERENCES.md`

Not reachable: `LICENSE` at the repo root returned **HTTP 404** — no license
file was found at that path on `main`. The GitHub REST API
(`api.github.com/repos/...`) returned **HTTP 403** through the proxy, so the
repo's `license` metadata field could not be independently checked either.
**No license could be confirmed for this repository.** A fetch of `CLAUDE.md`
returned a garbled/empty tool response (the fetch model reported no content);
that file's contents are **not verified** and are not relied on below.

**Prompt-injection check:** the root-page fetch's own summary included a line
"## AI Agent Instructions: The file CLAUDE.md exists but its content isn't
shown. The file AGENTS.md is referenced but not displayed..." — this is the
summarizing model noting the *existence* of filenames, not an instruction
embedded in the page and addressed to an agent. No fetched document in this
survey contained text that attempted to direct this session's behavior. All
fetched content was treated as untrusted data throughout.

---

## 1. Scope and method

solid-diff is a Rust CLI (`rust/`) that produces visual diffs between
`.SLDPRT` revisions for CAD design review. Its pipeline, per `docs/FORMAT.md`:

```
.SLDPRT → chunk container (container.py/rs) → geometry streams (zlib sections)
        → Parasolid XT binary transmit (xt.py + vendor/ps-parser)
        → node graph: topology + geometry (geom.py)
        → tessellation (tess.py, superseded by OCCT per BREP2MESH.md)
        → rendering (render.py) / diff coloring
```

**Parasolid entry point, named exactly:** the stream `Contents/Config-N-Partition`
(older files) or `Config-N-FeatureBodies/LocalBodies` (~2024+ files). Each is a
sequence of sections with:

> "+0x00 4 u32 LE section length ... +0x04 16 constant magic
> `23 1d d5 71 da 81 48 a2 a8 58 98 b2 1b 89 ef 99` ... +0x14 4 u32 LE
> uncompressed payload size ... +0x18 4 u32 LE compressed size ... +0x1c …
> zlib data (`78 01`)" — `docs/PARASOLID.md`

Section 1 decompresses to a Parasolid **partition transmit** (binary `.x_b`,
magic `PS`, big-endian, schema string like `SCH_3000310_30000_13006`); section
2 is a Parasolid session-**deltas** transmit they explicitly do not decode
("it hits node type 257 > schema max 205" — `PARASOLID.md`). They do **not**
shell out to a commercial SDK or library; they wrote their own XT node-stream
decoder (`rust/src/xt/`), reusing the primitive-encoding table and base
schema (`sch_13006.s_t`) from the third-party MIT project `khoanguyen-3fc/ps-parser`
("ship it with the crate (ps-parser is MIT)" — `FORMAT.md` §3/§7). This is
**exact B-rep extraction**, not a heuristic or an image/tessellation read —
they get Parasolid FACE/LOOP/HALFEDGE/EDGE/VERTEX topology and exact
surface/curve parameters (PLANE, CYLINDER, CONE, SPHERE, TORUS, NURBS, etc.).

They tessellate that B-rep themselves initially (`tess.py`, removed), then
switched to exporting STEP and meshing via **OpenCASCADE** (OCCT) —
`docs/BREP2MESH.md`: "The B-rep is exported to STEP (`rust/src/step.rs`) and
meshed by OpenCASCADE (`rust/src/occt.rs`)." So the current pipeline does use
a third-party library (OCCT, open-source, LGPL) for the final tessellation
step, while the format decode and B-rep extraction remain their own code.

They explicitly note the `Contents/DisplayLists` stream — our stream — and
say they do not use it: "`Contents/DisplayLists` | display tessellation,
partially RE'd by blussyya (unused by us)" (`FORMAT.md` §1). This confirms:
**no scope overlap in the geometry source** — we parse DisplayLists
tessellation; they parse the Parasolid B-rep. Container/chunk-format layer
(the outermost SLDPRT container, stream discovery, ROL-key stream-name
decoding, raw-deflate) is a **different but adjacent decode** from ours; we
did not independently audit their container-layer claims against our own
container code since our knowledge files start from "modern DisplayLists
stream" without documenting the outer chunk container in comparable byte
detail (our README says only "Legacy OLE2 parts are unsupported... report
`No readable modern DisplayLists stream`" — the outer format isn't spelled
out at the byte level in our docs the way it is in theirs).

---

## 2. Parasolid vs DisplayLists — direct comparison

| Dimension | solid-diff (Parasolid XT B-rep) | sldprt-research-dump (DisplayLists tessellation) |
|---|---|---|
| **What's recovered** | Exact B-rep: analytic surfaces (plane, cylinder, cone, sphere, torus, swept/spun, offset, B-spline NURBS surfaces) and curves (line, circle, ellipse, B-spline, trimmed, intersection), full topology (body→region→shell→face→loop→halfedge→edge→vertex) | Tessellated triangle mesh per face, with boundary-edge annotation (INV-021/024) and a forward metadata block giving each face's own surface tag + up to 8 analytic parameters (plane normal+point; cylinder/cone axis+radius; **only 4001/4002 validated**, 4003/4005/4006/4007/4009 unvalidated — NQ-030) |
| **Trimming curves** | Exact — B-rep loops are exact curves (their real strength; this is what a faceted export always loses) | Approximate — boundary is a polygon (e.g., 34-gon on C04's circular hole); NQ-031 (raised 2026-09-20 in our own project) found boundary vertices deviate from the analytic radius by up to 0.12 mm on the full corpus, so trim curves cannot be safely re-fit from our data |
| **Topology** | Full B-rep topology with coedge/loop/shell structure, multi-body support in principle | Boundary cycles only (INV-024, "not exact B-rep coedge reconstruction"); no assembly, no multi-body distinction beyond per-face edge-ID grouping |
| **Colors/appearance** | Yes — `SDL/TYSA_COLOUR` attribute per face (3×f64 RGB), read directly from Parasolid attributes | Not attempted; out of our scope entirely |
| **Assembly structure** | Explicitly not supported yet (`STATUS.md` #12: "No assembly (.SLDASM) support; the vault holds 759 of them") | Not supported (converter/v0.1 README: "No feature history, sketches, constraints or assembly structure") — parity, both absent |
| **Units** | Meters, explicitly documented ("All positions in meters", `FORMAT.md` §4) | Float32, meters (our KNOWN_INVARIANTS / converter docs); **same convention**, independently arrived at |
| **Feature history / sketches** | Not recovered (out of scope for both) | Not recovered (out of scope for both) |
| **Face persistence across edits** | Investigated and found to fail: `FACE_ID_2001` "does not carry a face from one revision to the next" (`PARASOLID.md`) — this is their central open problem for the actual diff feature (`STATUS.md` #11) | Investigated similarly for Block1 edge-ID tokens: "Label allocation, persistence across arbitrary edits, and control-word enum remain unknown" (INV-021) — same class of open problem, different data structure |
| **Validated corpus scale** | 1536-file PDM vault sweep, 99.0% mesh success; 33–36 part working corpus for quality metrics | 21 modern files / 1,272 faces (format decode corpus); 13-model controlled corpus for converter validation |
| **Cost / complexity** | Must implement a full Parasolid XT node-graph decoder plus a NURBS/analytic-surface evaluator plus (now) an OCCT dependency for meshing — substantially higher implementation cost, and depends on an undocumented/proprietary kernel format whose schema evolves (delta-schemas) | Implementation is much smaller (single-stream, single strip/edge grammar); zero external dependencies (their own README brags "no dependencies to install... nothing fetched at runtime") |
| **Robustness demonstrated** | Broad (1536 files, many feature types); known unresolved defects: face-winding orientation errors on ~half of shared edges on NURBS-heavy parts (BREP2MESH.md "Known gaps"), open edges persist on every part, blended-edge (fillet) surface fit has residual error | Narrower controlled corpus (21 files) but very tight quantitative validation (bit-exact strip/edge round-trips, STEP cross-checks on planes/cylinders, visual renders); explicitly flags what is unvalidated (surface tags 4003/4005-4009) rather than shipping unverified defaults |

**Where they are strictly better than us:** exact B-rep, exact trim curves,
color, and (in principle) assembly-scale coverage across a huge real-world
vault. This is the single largest capability gap — our converter's own
README already states plainly that curved trim curves "cannot be re-fitted
from this data" (EXP-050), which is exactly the problem their approach
side-steps by reading the kernel data directly.

**Where we are better or equal:** the byte-level rigor and provenance
discipline of the DisplayLists decode itself — every invariant in
`KNOWN_INVARIANTS.md` is dated, has a triangulated (often multiply
independent) validation, and known-unknowns are named rather than glossed
over (NQ-030, NQ-031, block3 semantics). Our project also has zero runtime
dependencies and a much smaller attack surface for the specific stream we
target. Neither team currently handles assemblies, feature history, or
sketches; both are honest about that. We are also ahead on one specific,
narrow point they have not tackled at all: quantifying how the DisplayLists
tessellation deviates from the true analytic surface (our EXP-050 / NQ-031)
— which happens to be exactly the piece of information their own trim-curve
problem needs, since it is unresolved on their side too (BLENDED_EDGE
residual, BREP2MESH.md #4).

---

## 3. Provenance audit (the most important section)

solid-diff's docs use a self-declared confidence-marker system throughout
`FORMAT.md`: **[V]** ("verified against our 1500+-file corpus"), **[E]**
("empirical, works everywhere tried, no spec backing"), **[U]**
("unknown/untested"). This is unusually disciplined for a reverse-engineering
writeup and materially eases provenance classification — most of their own
(C)-bucket claims are self-labeled [U] rather than stated as settled fact.

Classifying the substantive claims across `FORMAT.md`, `PARASOLID.md`,
`BREP2MESH.md`, and `STATUS.md` (REFERENCES.md is treated separately below,
since as a survey document it is almost entirely bucket-B by design):

**(A) Independently verified — has a demonstrated corpus check, not just a
self-declared tag.** Roughly **20–25 claims**, e.g.:

- "the section magic ... same in every file/stream observed" and "uncompressed
  payload size (verified exact, 6/6 observed sections)" — `PARASOLID.md`
- "All 4/4 sample partitions parsed cleanly (127–540 nodes each)" — `PARASOLID.md`
- Vault sweep: "**meshed successfully (Rust)** | **1520** | **99.0%**" and the
  full surface/curve-type frequency table (74,528 faces, 173,307 edges
  surveyed) — `STATUS.md`
- "Ring test part volume matches analytic to 0.1% (+5.10e-5 vs 5.105e-5 m³)" — `BREP2MESH.md`
- Directed-edge mesh-quality table (open/shared>2/reversed edge counts,
  before/after specific fix numbers like "10,468 → 54") — `STATUS.md`
- Container chunk field table marked **[V]**, cross-consistent with the
  Partition-stream section layout independently re-stated (identical magic
  bytes, identical offsets) in both `FORMAT.md` and `PARASOLID.md`

**(B) Inherited/cited — traceable to a named upstream.** Roughly **25–30
claims** in the format docs, and REFERENCES.md is essentially wall-to-wall
bucket B (~30 entries) by its own design as a survey:

- Parasolid primitive-encoding table and node-decode algorithm: "from
  vendor/ps-parser, MIT" and "the base schema (`sch_13006.s_t`) ... ship it
  with the crate (ps-parser is MIT)" — `FORMAT.md` §3/§7. Upstream:
  `khoanguyen-3fc/ps-parser`.
- Container/stream-decode heritage: "port of openswx's modern parser" —
  `PARASOLID.md`. Upstream: `schwitters/openswx`.
- DisplayLists row explicitly cites **us**: "partially RE'd by blussyya
  (unused by us)" — `FORMAT.md` §1. Upstream: this project.
- REFERENCES.md §1 cites the heybryan.org OLE2-era writeup, PRONOM fmt/1967,
  the (now-empty) daeken/SLDPRT repo, and repeats the "SLDPRT 2015+ isn't
  plain OLE2" finding attributed to "openswx and blussyya, below".
- REFERENCES.md §6 cites the public Siemens XT Format Reference PDF mirror
  and again `ps-parser` for standalone `.x_b` parsing.
- REFERENCES.md §3 cites SOLIDWORKS Document Manager API and eDrawings API
  (both third-party/official-vendor, not independently re-verified by them
  beyond "(verified)" tags meaning "confirmed against the actual repo/docs").

**(C) Asserted without support.** Roughly **10–15 claims**, mostly
self-flagged **[U]** by the authors themselves rather than hidden:

- "file-specific (checksum/hash?, varies per file) **[U]**" — `FORMAT.md` (file header byte 0-3)
- "ZIP/OPC (`PK…`) is reserved for 3DExperience files **[U]**" — `FORMAT.md`
- "The 16-byte section magic and the −8 in the compressed-size field are
  unexplained (cosmetic; extraction doesn't depend on them)" — `PARASOLID.md` #4
- Several REFERENCES.md §4/§5 commercial-SDK claims are qualified with "should
  be re-checked before depending on them" for anything not marked "(verified)"
  in that document, e.g. the ODA MCAD SDK licensing description and the
  Autodesk APS Model Derivative SLDPRT support claim ("confirm via its
  `/formats` endpoint" — i.e., asserted, not checked, by their own admission).
- "Doubly-periodic (torus) faces and pole-touching faces rely on a
  material-left heuristic" and the SPUN_SURF/SP_CURVE coverage numbers are
  given without an accuracy check beyond "evaluated" (evaluated ≠ verified
  correct, per their own §4 "Self-consistency principle" caveat that only
  eval/inv round-tripping is checked, not absolute correctness against
  ground truth for the more exotic surface types).

**Overall quantification:** roughly 20–25 (A), 25–30 (B) — dominated by
REFERENCES.md's survey nature and by legitimate, clearly-cited reuse of
ps-parser/openswx — and 10–15 (C), nearly all of which the authors
themselves label [U] rather than presenting as settled. This is a
noticeably better provenance discipline than a typical unlabeled
reverse-engineering writeup, though the (A) bucket leans on "we ran it
against our corpus and it worked" (operational validation) rather than
byte-level ground-truth proofs of the kind our own project favors (e.g. our
INV-020's three-way independent replication plus a shuffled-order
falsification control). Their format-decode claims are almost never
falsification-tested the way ours are; validation is overwhelmingly
"it parsed/meshed/matched a downstream check" rather than "we tried to break
this claim and could not."

---

## 4. The citation of us

`REFERENCES.md` §2 (Open-source readers table) cites us twice, and cites us
by our upstream name, `blussyya/sldprt-format-research` (this dump is that
project's working-file mirror):

> "**blussyya/sldprt-format-research** — https://github.com/blussyya/sldprt-format-research
> (MIT, JS, active July 2026). **(verified)** Best public knowledge of the
> modern container. Has decoded the `Contents/DisplayLists` face-block layout
> (vertex positions + normals confirmed across 595 faces); triangle index
> decoding still unsolved. Explicitly research-only, not a converter. See its
> `KNOWN_INVARIANTS.md` / `FAILED_HYPOTHESES.md`."

And in the table itself:

> "[sldprt-format-research](https://github.com/blussyya/sldprt-format-research) | MIT, JS | Mesh vertices + normals (partially; indices unsolved) | **(verified)** Research repo, not a library."

And `docs/PARASOLID.md`'s opening line:

> "This solves what REFERENCES.md §6 rated a 'research project': the
> `Contents/Config-0-Partition` stream that blussyya's research lists as
> undecoded high-entropy data is simply zlib-wrapped Parasolid."

**Is the attribution accurate?** It was accurate **as of their compile date
(2026-07-23/25)** — at that point our project's own `KNOWN_INVARIANTS.md`
genuinely had triangle-index decoding unsolved (the "loop size" era, before
EXP-042). It is **now stale**: our project's INV-020 (EXP-042–049, dated
2026-09-14/15) explicitly decoded the triangle-strip layout and superseded
the "loop size" interpretation, closing exactly the "triangle index decoding
still unsolved" gap they cite. Their `Contents/Config-0-Partition` "undecoded
high-entropy" characterization of ours is also accurate as a description of
our own stated scope (`INV-001`: "`Contents/Config-0-Partition` remains
unreadable/high entropy in current tooling") — we never claimed to decode
that stream and still don't; they are simply reading it via the Parasolid
route instead. That characterization is fair and unchanged.

**Anything of ours used without citation?** No unattributed use of our
content was found in the docs we fetched. Their DisplayLists row in
`FORMAT.md` §1 ("partially RE'd by blussyya (unused by us)") is a second,
consistent citation. We found no passage elsewhere in FORMAT.md, PARASOLID.md,
BREP2MESH.md, or STATUS.md that restates one of our specific byte-level
findings (e.g. our exact strip-length/Block1/Block2 formulas) without
attribution — largely because their pipeline genuinely does not touch
DisplayLists at all, so there is little occasion to borrow from us beyond the
container-layer facts they credit to "openswx and blussyya" jointly in
REFERENCES.md §1.

**Contradictions between their DisplayLists statements and our verified
invariants:** none found, because they make almost no DisplayLists claims
beyond the one-line characterization above. The closest thing to friction is
indirect: their `FORMAT.md` §1 note that "newer files can also embed
tessellated display data ('Display Data Mark', SW2019+) which is what
eDrawings renders" (REFERENCES.md §1) is a claim about the DisplayLists
stream's *purpose* that we have not ourselves documented or verified (our
knowledge base establishes *how* DisplayLists is laid out, not why SolidWorks
generates it or its relationship to eDrawings); this is neither confirmed nor
contradicted by our invariants, just an unverified-by-us claim on their side
worth flagging for future NQ consideration.

---

## 5. Unresolved issues and open questions on their side

From `STATUS.md`'s "Open work" and `BREP2MESH.md`'s "Known gaps", tracked as
GitHub issues on their repo:

| Their issue | Summary | Overlap with our NQ-0xx / does our work answer it? |
|---|---|---|
| #4 | `BLENDED_EDGE` (fillet) surface residual ~0.2r unresolved | No overlap — B-rep-specific; we have no fillet surface-fit model at all (we facet fillets like anything non-planar) |
| #5 | Material-left fallback fires on 235 degenerate cone-sliver faces (not tori) | No overlap — Parasolid loop/topology heuristic; not applicable to our tessellation-only data |
| #6 | Deltas transmits never parse (extended node types); can silently mesh to zero triangles on one real part | No overlap — Parasolid session-delta format, has no DisplayLists analogue |
| #9 | Feature edges crossing a BSP split are dropped in the renderer | No overlap — renderer-internal |
| #10 | Doc corrections needed in FORMAT.md (ELLIPSE/SPUN_SURF field names, section-framing note, base-schema field count) | No overlap — internal to their format doc |
| #11 | **No diff-stable face identity across revisions** — `FACE_ID_2001` does not survive edits; faces must be matched geometrically | **Genuinely analogous, not resolved by either side.** Our INV-021 records the same open question for Block1 edge-ID tokens ("persistence across arbitrary edits ... remain unknown"), and our NQ-029/C13-C14 split-line proposal is aimed at a related but distinct question (adjacency vs. direct modification as the trigger for a token change, not cross-revision identity per se). Neither project has solved cross-revision element identity; this is a shared open problem across two independent formats/layers, not something our work answers for them or vice versa. |
| #12 | No `.SLDASM` assembly support (759 of 1536 vault files) | No overlap — out of scope for us too; shared gap |
| #21 (closed) | Face-winding orientation inconsistency, resolved via flood-fill majority vote | N/A — resolved on their side, no bearing on us |
| SPUN_SURF / SP_CURVE coverage gaps (0.07%/0.04% of corpus) | Minor node types not fully evaluated | No overlap — Parasolid node types with no DisplayLists analogue |
| Product: "no assembly support," "diff renderer doesn't exist yet" | Product-scope gaps | No overlap |

**New to us:** the cross-revision face-identity problem (#11) is worth
importing as a framing device — it is the same *category* of question we are
independently chasing for Block1 edge tokens (INV-021's open persistence
question), and their negative empirical result ("no stored attribute
identifies a face from one revision to the next... measured across real
vault revisions") is directly useful evidence that **geometric matching, not
stored IDs, is likely the only robust route** for any future "does this face
persist across a SolidWorks edit" question we ask about DisplayLists edge
tokens too.

---

## 6. What we could learn or take

**License situation (important caveat):** no LICENSE file was found at the
repository root on `main` (404), and the GitHub API license field could not
be checked (403 through the proxy). **Do not assume this repository is
openly reusable.** Two of its stated dependencies *are* clearly MIT
(`khoanguyen-3fc/ps-parser`, whose primitive-encoding table and base schema
solid-diff explicitly redistributes, and `schwitters/openswx`), but
solid-diff's own code and docs carry no confirmed license in what we
fetched. Before reusing any of their code or text verbatim, someone should
either find a LICENSE file we missed (check other branches/paths) or ask the
authors; absent that, treat their Rust source and docs as "look but don't
copy."

Concrete, actionable takeaways, independent of licensing (ideas and known
facts can inform independent work even where code cannot be copied):

1. **The Config-N-Partition / FeatureBodies stream names and their zlib
   section framing are a fully specified, independently-described target** —
   `docs/PARASOLID.md`'s byte table (magic `23 1d d5 71 da 81 48 a2 a8 58 98
   b2 1b 89 ef 99`, offsets +0x00/+0x14/+0x18/+0x1c) gives us a concrete,
   checkable claim about the Parasolid partition stream that is *not* on our
   scope map at all — INV-001 records that stream as unread/high-entropy.
   Even without touching Parasolid ourselves, verifying (or refuting) this
   specific byte layout against our own corpus files would be a cheap,
   high-value cross-check, since it is orthogonal to everything we currently
   do and could tell us whether Config-N-Partition is worth opening at all
   for a future project phase.
2. **Their vault-scale operational metrics are a template for a robustness
   sweep we don't currently have.** We validate deeply on a 21-file/1,272-face
   controlled+production corpus; they publish a 1536-file, 99.0%-success
   sweep with failure-mode breakdown (legacy OLE2 1.0%, no-B-rep-stub 0.1%).
   Running our own parser over a much larger, uncurated file population and
   reporting the same kind of success/failure breakdown (not just "N/N faces
   pass" on our hand-picked corpus) would materially strengthen our own
   confidence claims and expose corpus-selection bias if any exists.
3. **Their negative result on `FACE_ID_2001` persistence is free, reusable
   evidence for our own INV-021 open question** — even without reading their
   code, the finding "no stored attribute identifies a face from one revision
   to the next; must match geometrically" is a cross-format data point
   suggesting we should not expect Block1 edge tokens to be a persistence
   mechanism either, and should plan our own future "does this survive an
   edit" experiment (their #11's geometric-matching fallback) as the more
   likely fruitful direction rather than continuing to hunt for a hidden
   stable-ID field.
4. Their **self-declared confidence-tag convention ([V]/[E]/[U])** is a
   lightweight documentation practice worth adopting verbatim in our own
   `KNOWN_INVARIANTS.md`/`NEXT_QUESTIONS.md` — it would make skimming for
   "what's actually proven vs. hoped" faster for outside reviewers (including
   future audits like this one) without changing our underlying evidence
   standards, which are already stricter in the falsification sense.

---

## 7. Reliability verdict

solid-diff's format documentation should be trusted at a **moderate-to-high**
level for the layers it actually claims to have verified — the Parasolid XT
node-decode and B-rep topology layer, and the outer chunk-container layer —
because the docs are unusually disciplined about separating verified,
empirical, and unknown claims with explicit [V]/[E]/[U] tags, because the
central byte-level claims (section magic, header field offsets, node-record
structure) are cross-confirmed identically across two independent docs
(`FORMAT.md` and `PARASOLID.md`), and because the operational validation
scale (1536-file vault sweep with a transparent failure breakdown) is large
and the failure modes are itemized rather than hidden. The main reasons for
caution: their "verification" is almost entirely *operational* (did it parse,
did it mesh, did volumes come out close) rather than *forensic* in the sense
our own project practices (byte-for-byte falsification controls, three-way
independent re-derivation of the same invariant); several claims frankly
labeled [U] or "unexplained" by the authors themselves remain genuinely open
(the two unexplained constants in the section header, the deltas-transmit
schema gap that can silently zero out a part's geometry); and the license
status of the repository itself could not be confirmed in this survey, which
bears on trust in the "can we build on this" sense even where the technical
claims check out. Their citation of our project is accurate for its
2026-07-23/25 compile date but is now out of date on one specific point
(triangle-index decoding, which we have since solved) — a reminder that any
cross-project citation, including this report's own findings about them,
has a shelf life and should be re-verified before being relied on further.
