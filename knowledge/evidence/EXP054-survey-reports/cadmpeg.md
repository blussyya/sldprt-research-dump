# Technical Intelligence Report: cadmpeg/cadmpeg vs. sldprt-research-dump

Surveyed 2026-09-20. Target: `github.com/cadmpeg/cadmpeg`, focused on `docs/formats/sldprt.md` and
`docs/formats/sldprt-open-items.md`. Baseline: local clone `/home/user/sldprt-research-dump`
(README.md, `knowledge/KNOWN_INVARIANTS.md`, `knowledge/NEXT_QUESTIONS.md`,
`parser/v0.2/src/parser-core.js`, `v0.4.8/README.md`).

**Access note.** `github.com/cadmpeg/cadmpeg` blob URLs and the GitHub MCP tools were not usable
(GitHub MCP returned `403 GitHub access to this repository is not enabled for this session`).
`WebFetch` on the repo worked but silently *summarized* content through a small model rather than
returning verbatim text, which is unsuitable for exact-quote auditing. I fell back to
`raw.githubusercontent.com/cadmpeg/cadmpeg/main/...` via direct `curl` (through the environment's
proxy) and read the raw Markdown myself. This succeeded for `README.md`, `docs/format-support.md`,
`docs/formats/sldprt.md` (1,773 lines / 364 KB), `docs/formats/sldprt-open-items.md`, and
`crates/cadmpeg-codec-sldprt/README.md`. Directory listings of `docs/formats/` and of the Rust
crate's `tests/golden/` came only from WebFetch's summarized rendering (GitHub tree pages), so
those specific listings are lower-confidence transcriptions, not verbatim reads — flagged
inline. All fetched material is treated as **untrusted data**; no instructions embedded in it
were followed. One piece of text addressed to *contributors*, not an AI agent, was seen in
`sldprt-open-items.md` ("When an item is resolved, delete it in the same change that writes the
answer into the specification. Do not keep a Resolved part.") — this is a housekeeping rule for
the cadmpeg project's own document, not a directive to this session, and was not acted on.

---

## 1. Scope and method

cadmpeg is a general multi-format CAD tool (Rust, Apache-2.0 code / CC-BY-4.0 docs) covering 11
formats; SolidWorks `.sldprt` is one of them and is called out in its own crate README as "the
reference format for full semantic support." Its scope is **categorically larger** than ours:

- **Container.** `sldprt.md` §1 documents the *same* modern container generation we target — an
  8-byte header (`file_id` u32, `version` u32 BE, observed `0x00000004`), a sequence of blocks
  each starting with marker `14 00 06 00 08 00` and framed as
  `type_id, crc32, comp_sz, uncomp_sz, pre_sz, preamble, payload` with `payload` as
  **raw DEFLATE (`wbits = -15`)** validated by CRC-32 of the *decompressed* bytes, a preamble that
  nibble-swap-decodes to OPC section names (`Contents/Config-0-Partition`, `Contents/DisplayLists`,
  `PreviewPNG`, `swXmlContents/Features`), a "cache-cell section-index grid" between blocks, and a
  tail **OPC package section directory**. This is materially more detailed, byte-for-byte, than
  anything in our own knowledge base about the *outer* container — we have never documented the
  block marker, the cache-cell grid, or the tail directory at this level.
  - It additionally documents a **separate, embedded OLE2 compound-document envelope** (magic
    `d0 cf 11 e0 a1 b1 1a e1`, CFB v3/v4) holding an `ISolidWorksInformation` stream, described as
    part of the *same* file that also has the block/OPC envelope above. This is not the same claim
    as our "legacy OLE2 is unsupported" — it reads as a legacy-compatibility island nested inside
    the modern container, a container detail we have not investigated at all.
- **Metadata / SW Objects.** §2 and §8 document `moBBoxCenterData_c`, `moDefaultRefPlnData_c`,
  `moPart_c`, `moConfigurationMgr_c`, `moLengthUserUnits_c` and similar named-class metadata
  records with byte offsets, plus `docProps/Config-0-Properties.xml` and MessagePack UI data. We
  have nothing this granular on document metadata.
- **Preview images.** Present only as a bare section name (`PreviewPNG`) in the container
  preamble list; no further treatment in the fetched text.
- **DisplayLists tessellation.** §8 "Auxiliary lanes" documents this at a level directly
  comparable to our INV-020/021/022 — see §2 below.
- **Parasolid partition (the actual B-rep).** §§3–7 (roughly 1,400 of the doc's 1,773 lines) are
  devoted to decoding the Parasolid XT stream inside `Contents/Config-N-Partition` /
  `Config-N-Deltas`: typed topology records, entity/face families, body records, and geometry
  carriers (analytic surfaces, NURBS, offset surfaces, blends, swept/spun surfaces, intersection
  curves). This is the stream our own `INV-001` calls **"unreadable/high entropy in current
  tooling"** and our README states outright: **"We do not parse Parasolid."**
- **Versions.** `docs/format-support.md` gives an explicit dialect ladder for `.sldprt`:
  `sldprt:sw-version-pre-12000` and `sldprt:sw-version-12000-plus`, both "detected"/"preserved" at
  ladder level L1, plus `sldprt:unknown` ("unclassified-recovered"/"emitted"). This is a version
  split we have never attempted (our corpus is 24 files, no version metadata cross-check, and
  three OLE2 files explicitly excluded as legacy/unsupported).
- **Geometry source.** cadmpeg gets geometry from **both** paths, and treats them as distinct
  and only partially reconciled: (a) DisplayLists tessellation ("Display-list geometry transfers
  into tessellation arenas and can be regenerated. Stable face-to-triangle ownership remains
  open." — `format-support.md`), and (b) full **Parasolid B-rep extraction** into typed analytic/
  NURBS surface and curve carriers with topology (body/region/shell/face/loop/coedge/edge/vertex).
  The B-rep is explicitly the primary "exact" geometry; DisplayLists is auxiliary, used mainly to
  assign colors/appearances and, per open item AL-01, to determine which B-rep face a triangle
  table belongs to.
- **Running code, not just a doc.** There is a real Rust crate, `crates/cadmpeg-codec-sldprt`
  (`src/`, `tests/golden/{decode,fixtures,inspect}` per a WebFetch directory summary — not
  independently verified byte-for-byte), implementing `SldprtCodec: Decode + Encode`, with a
  **round-trip writer** (byte-exact replay of unchanged source, and patch/regenerate paths for
  edited geometry, features, sketches, PMI). The repo also states
  `docs/layouts/sldprt.md`/`.toml` is a **machine-checked** offset table cross-verified against
  the decoder by `cargo test -p cadmpeg --test layout_tables`, i.e. the prose spec and the code's
  literal field offsets are asserted to be kept in sync by an automated test — a provenance
  mechanism we do not have an analogue of (our knowledge base is hand-maintained prose plus
  separate JS parsers, with informal cross-checks like "parity with the v0.4.5/v0.4.6 reference").

**Summary verdict on scope**: cadmpeg's SLDPRT coverage is Parasolid-B-rep-first with
DisplayLists as a secondary, imperfectly-linked auxiliary lane, full feature history / sketch /
equation / pattern decoding, and a write path. Ours is DisplayLists-tessellation-only, read-only,
with zero Parasolid coverage. The two projects are solving adjacent but different problems on
(likely) the same underlying container generation.

---

## 2. Claim-by-claim diff against `KNOWN_INVARIANTS.md`

The only cadmpeg section that overlaps our invariants at all is `sldprt.md` §8, "Auxiliary lanes"
(DisplayLists), quoted here in full for the load-bearing paragraph:

> "**DisplayLists tessellation** uses a 6-descriptor table: List A strip lengths, Positions/Normals
> f32 metres, and Lists B/C/D. Each descriptor is `item_size u32 LE`, `kind u32 LE`, `flags u32 LE`,
> `count u32 LE`, then `item_size * count` data bytes. All six descriptors have `flags = 2`. Their
> `(item_size, kind)` pairs are `(4, 8)`, `(12, 100)`, `(12, 100)`, `(4, 8)`, `(4, 8)`, and `(1, 8)`.
> Let `N = len(ListA)`, `C = sum(ListA)`, and `E = sum(2*ListA[i] - 2)`. The Positions count is
> `C`; the Normals count is zero or `C`; `ListC[i] = 2*ListA[i] - 2`; and `TriCount = C - 2*N`.
> Lists B and D are both empty or both have `E` entries. List B contains finite f32 values.
> List D contains byte values." — `docs/formats/sldprt.md`, §8

| Our INV (statement) | cadmpeg's statement | Verdict | Evidence each side offers |
|---|---|---|---|
| **INV-002/INV-020**: per-face record order is precursor `[4,8,2,S]` (strip lengths `L`), positions `[12,100,2,V]`, normals `[12,100,2,V]`, Block1 `[4,8,2,N]`, Block2 `[4,8,2,S]`, Block3 `[1,8,2,N]` | Six fixed-order descriptors with `(item_size,kind)` = `(4,8)`,`(12,100)`,`(12,100)`,`(4,8)`,`(4,8)`,`(1,8)` — i.e. ListA, Positions, Normals, ListB, ListC, ListD | **AGREE** (structurally identical byte grammar and ordering) | Ours: byte-offset dumps + `parser/v0.2` decode, 21 files / 1,272 faces (EXP-042). Theirs: prose only in the fetched doc; claimed backed by a machine-checked layout table and a Rust decoder/tests we could not independently inspect. |
| **INV-020**: `V = sum(L)` (positions count equals sum of strip lengths) | `C = sum(ListA)` is the Positions count | **AGREE**, same formula, different variable names (`V`↔`C`, `L`↔`ListA`) | Ours: EXP-042, 50,976 triangles. Theirs: asserted, no worked example with real byte offsets in the fetched text. |
| **INV-018/INV-020**: `Block2[i] = 2*L[i] - 2`, and `sum(Block2) = Block1 word count N = 2*(V-S)` | `ListC[i] = 2*ListA[i] - 2`; `E = sum(ListC)`; "Lists B and D are both empty or both have `E` entries" | **AGREE**, exact algebraic match (`ListC`↔`Block2`, `E`↔`Block1`'s word count `N`) | Ours: EXP-013/016/017 (100% match, 8,763 sections), and the v0.4.5-corrected pipeline (1,172/1,172 faces). Theirs: asserted; presented as a closed-form rule with no counterexample discussion, no per-file counts. |
| **INV-020**: triangle count via strip zig-zag; face has `V - 2S` triangles (derivable) | `TriCount = C - 2*N` where their `N` = strip count = our `S` | **AGREE** on the count formula (`C-2N` ≡ `V-2S`) | Same as above on our side. Theirs: asserted; the *exact* zig-zag winding rule we document (`i even: (i-2,i-1,i)`, `i odd: (i-1,i-2,i)`) is **not spelled out** in the fetched §8 text — see gap below. |
| **INV-021**: Block1 body is `u32` **edge-ID tokens** — leading control word `1` per strip, then `ID(0,1), ID(0,2),ID(1,2), ID(1,3),ID(2,3), ...`; `0` = interior edge, nonzero = boundary edge shared with the adjoining face | "List B contains finite f32 values." | **CONTRADICT** (interpretive, not byte-level — see caveat) | Ours: EXP-043/049, 112,047 tokens, 41,010 nonzero boundary / 71,037 zero interior, 0 exceptions, plus a shuffle-control falsification (44,640 exceptions when edge order is scrambled) showing the *ordering* is load-bearing — strong evidence for an integer-ID interpretation, not a float one. Theirs: a single unqualified sentence, no worked example, no test described. **Caveat**: both claims describe the same 4-byte-wide field (`item_size=4`); the difference is purely in how the bit pattern is *interpreted* (u32 edge ID vs. f32 float), and cadmpeg's own "finite f32" test is nearly non-discriminating — most small non-negative 32-bit integers (e.g. our observed IDs like `1, 5, 62, 79, 82, 150, 153`) also happen to decode as finite (denormal-range) floats, so "finite" does not by itself demonstrate float *semantics*. This is a genuine, quotable disagreement worth flagging upstream, but the two sides are not equally well-supported: ours has a targeted falsification control, theirs does not. |
| **INV-022**: Block3 is `uint8[N]`, all-zero on the whole corpus, semantics unknown | "List D contains byte values." | **AGREE** on type/byte-width; **NO independent semantic claim on either side** | Ours: EXP-042/049, 122,142 bytes, all zero, syntax-only claim. Theirs: type only, no semantic claim, no occurrence data. |
| Surface tags **4001**=plane, **4002**=cylinder, **4003**=cone; **4005/4006/4007/4009 unvalidated** (our open question, NQ-030) | **Not present.** A full-text search of `sldprt.md` for `4001`, `4002`, `4003`, `4005`, `4006`, `4007`, `4009` returned **zero matches**. | **NO OVERLAP** | Ours: EXP-045, 94/94 controlled plane/cylinder faces validated against exported STEP; 4005/4006/4007/4009 explicitly flagged unvalidated (NQ-030, occurrence table by model). cadmpeg does not use, or does not document using, any raw numeric type-tag field for DisplayLists surface identity at all — see below. |
| **INV-023**: forward metadata reaches a surface record (raw tag `u32`, direction `f64[3]`, 8 `f64` parameter slots, edge-ID/type-tag pairs) linked to Block1's nonzero IDs | Not documented in §8 in the fetched text. Instead, cadmpeg's *face-ownership* problem (AL-01, open item) is solved — where it is solved at all — by **geometric fit** of triangle-table positions against candidate B-rep face supports (exact-support incidence test, NURBS parameter-inversion witness, chordal-deflection candidate scoring, coincident planar/cylindrical/conical boundary-relation tests) or by matching a `DisplayFace` slot's UTF-16 persistent-surface-reference string (`<SurfIdRep class>,<feature source ID>,<local surface ID>,...`) against a B-rep face's `ATOM_ID_2001`. | **NO OVERLAP** (different mechanisms for a related problem) | Ours: EXP-044/045, ID sets match on 1,272/1,272 faces; 94/94 controlled records match STEP. Theirs: a page of qualitative decision rules (§8) with no per-corpus pass/fail counts in the fetched text, and the open item AL-01 states this face-range assignment is **unresolved** for "procedural, polygonal, opaque, and non-exact NURBS supports" and "tables without a complete matching identity." |
| **INV-024**: boundary graphs have degree 2 everywhere; edge IDs have exactly 2 face owners; 389/3,278 groups differ in subdivision | Not addressed in the fetched §8 text | **NO OVERLAP** | Ours: EXP-046, 1,272/1,272 faces, 1,698 cycles, 3,278 groups. |
| Units: coordinates **float32 metres** | "Positions/Normals f32 metres" (§8); general §9 "Length fields are metres… convert from metres to millimetres by a factor of 1000" (applies to the Parasolid/B-rep layer, f64 there) | **AGREE** on the DisplayLists layer specifically (f32, metres); consistent broader claim that the *raw file* stores metres throughout, with cadmpeg's own IR converting to millimetres on output — a downstream choice, not a contradiction of the on-disk unit. | Ours: EXP-045, residuals down to `1.34e-9 m`; float32 precision explicitly discussed (10 mm cube round-trips as 9.9999998 mm). Theirs: `crates/cadmpeg-codec-sldprt/README.md`: "Parasolid model lengths use metres; `CadIr` geometry uses the document's IR units and decoded coordinates are expressed in millimetres." Consistent, no worked precision numbers given for DisplayLists f32 specifically. |
| Extended/compact per-face table header, nonzero-token distinction (AL-03) | `uoTempFaceTessData_c` has a **compact form** (triangle-count u32, strip-count u32, descriptors start at `+8`) and an **extended form** (same two counts, then u32 `1,0,0,<nonzero token>` at `+8,+12,+16,+20`, 16 zero bytes, descriptors at `+40`); "the fixed cells and nonzero token select the extended form" | **THEY-HAVE-MORE** — genuinely new to us | We have not documented or looked for a second, longer per-face header variant; `parser/v0.2` (`parser-core.js`) reads the six arrays directly with no header/token check at all beyond the `[4,8,2,S]`/`[12,100,2,V]` signature words themselves. If any file in our corpus (or outside it) uses the extended form, our parser would currently either silently fail the strict header check (`Unexpected array header`) and reject the face, or — worse — misparse it if the extra bytes happen to look like a valid descriptor start. **This is the single most actionable byte-level finding in this survey; see §4.** |

**Overall invariant-diff tally**: 6 AGREE (container/table order, `V=sum(L)`, `Block2` formula,
`Block1` word-count identity, triangle-count formula, Block3 byte-type/all-zero-so-far,
units-on-DisplayLists), 1 CONTRADICT (Block1/"List B" interpretation: integer edge-ID vs. "finite
f32"), 4 NO-OVERLAP (surface tags 4001–4009 entirely absent from cadmpeg's text; forward
metadata/edge-table grammar; boundary-cycle/edge-ownership topology; face-range/AL-01 ownership
mechanism), 1 THEY-HAVE-MORE (extended table-header form, AL-03).

---

## 3. Provenance audit

**Claim-type classification of `sldprt.md`'s substantive format claims** (Parasolid §§3–7,
container §1, and DisplayLists §8 combined):

- **(A) Independently verified, visible in the document itself**: **effectively none.** The
  1,773-line document contains **no hexdumps, no named example files, no per-file/per-face
  counts, no "N/M pass" tables** anywhere in the sections read (container §1, DisplayLists §8,
  units §9). Every claim is phrased as flat, present-tense assertion ("Length fields are metres,"
  "The Positions count is `C`," "List B contains finite f32 values"). This is a stark contrast to
  our own `KNOWN_INVARIANTS.md`, where essentially every entry carries a **Status**, **Evidence**,
  **Files tested**, **Faces/models tested**, **Confidence**, and **Related experiments** field,
  and links to an `evidence/` directory of raw experiment output.
- **(A′) Verified elsewhere, referenced but not shown**: the document repeatedly points at a
  companion machine-checked table (`docs/layouts/sldprt.md`/`.toml`, "the canonical source for the
  numbers... `cargo test -p cadmpeg --test layout_tables` proves the two agree") and at a Rust
  decoder/encoder with a golden test suite (`crates/cadmpeg-codec-sldprt/tests/golden/`). This is
  real engineering provenance — offsets that don't match the code would fail CI — but it verifies
  **internal consistency between the prose and the code**, not that either one matches real
  SolidWorks files, since we could not read the golden fixtures (GitHub MCP access denied; a
  WebFetch directory summary only reports subfolder names `decode/`, `fixtures/`, `inspect/`,
  not file contents or provenance of the binaries in them).
- **(B) Inherited/cited to a named upstream**: **zero found.** Neither `sldprt.md`,
  `sldprt-open-items.md`, nor the main `README.md` contains a bibliography, "References," "See
  also," "Acknowledgments," or citation of any external source — no mention of openswx,
  solid-diff, ps-parser, heybryan.org, the 2013 StackOverflow answer, the ODA MCAD SDK, or the
  SolidWorks Document Manager API turned up in a full-text search of the fetched documents. The
  project's own stated sourcing policy (`README.md`): **"Format knowledge comes from legally
  possessed CAD files and public documentation. Vendor SDKs, decompiled binaries, and
  confidential material are prohibited"** — a *policy* about where knowledge is allowed to come
  from, not a citation trail for any specific claim.
- **Credit to our project**: **none.** A full-text search of every fetched file for
  `blussyya`, `sldprt-format-research`, and `sldprt-research-dump` returned zero matches. (`
  DisplayLists` itself appears dozens of times, as expected — it is the OPC stream/section name,
  not a reference to us.)
- **(C) Asserted without in-document support**: **the large majority of substantive claims**,
  by the elimination above. This is not necessarily a criticism of cadmpeg's underlying
  correctness — the project visibly does have a real decoder, a real test suite, and an explicit
  provenance-declaration requirement for contributors ("Commits require DCO sign-off; decoder and
  specification changes also require a provenance declaration" — `README.md`) — but the
  **published specification document, read on its own, is not self-evidencing** the way our
  `KNOWN_INVARIANTS.md` is. A downstream reader of `sldprt.md` alone cannot tell which of its
  hundreds of dense claims were checked against how many real files, versus reverse-engineered
  from a handful of examples, versus inferred by analogy with other kernels (much of §§3–7 reads
  as generic Parasolid-XT knowledge, which is separately, publicly documented for the XT format
  outside SolidWorks specifically).

**Quantified split (qualitative, not a literal per-sentence count given the document's size and
density)**: of the claims overlapping our own invariants (§2's table, 12 rows), 0 are
independently verified *in the document text itself*, 0 cite a named upstream, and all 12 are
type-(C) as written — even the ones we independently confirm to be TRUE (the six AGREE rows) are
merely asserted, not demonstrated, by cadmpeg's own text. The best-supported claims in the whole
document, by cadmpeg's own account, are the ones tied to the machine-checked layout table and the
golden-test-backed codec — but that support lives in code and test fixtures we could not read in
this session, not in the specification prose.

---

## 4. Their open items — cross-check against our NQ items

`docs/formats/sldprt-open-items.md` lists 41 open items across six sections (Body classification,
Geometry carriers, Container metadata, Auxiliary lanes, Design intent, Container record
semantics). **All but four are exclusively about the Parasolid B-rep / feature-history layer**
(topology-record precedence, curve-carrier grammar, offset/blend surface carriers, sketch relation
codes 29–85+, extrusion end-spec codes, pattern-seed binding, etc.) — a layer we do not touch at
all, so these are out of scope for us by construction, not because we lack an answer.

The four **Auxiliary lanes (§4)** items are the only ones in DisplayLists/appearance territory:

| Their item | Their question (quoted) | Does our work answer it? | Matches an NQ? | New to us? |
|---|---|---|---|---|
| **AL-01** DisplayLists face ranges | "How does a B-rep face attribute select its triangle range in a DisplayLists block?" | Partially, differently: our INV-023/024 link a face's DisplayLists table to its *own* forward metadata (surface tag, direction, parameters, edge-ID table) — not to an external B-rep face-attribute. We don't do B-rep face matching at all, so we can't answer their specific question. | Adjacent to **NQ-030** (surface tags 4005–4009 unvalidated) and **NQ-031/EXP-053**'s trim-curve problem, but not the same question. | **Yes — the ATOM_ID_2001/SurfIdRep persistent-identity matching idea is new to us** and is a candidate *alternative* method for face/surface identification if we ever needed to cross-reference against a B-rep (we currently don't have one to cross-reference against). |
| **AL-03** extended table-header token | "What does the nonzero extended-form token encode?" | No — we were unaware a second header form (`uoTempFaceTessData_c` extended form, 40-byte prefix before the descriptor table) exists at all. | **Not on our list; genuinely new.** | **Yes — actionable.** See recommendation below. |
| **AL-04** mesh polyline candidate selection | Helix-input polyline disambiguation | Out of scope (sketch/feature layer, not tessellation) | No | Not relevant to our current scope. |
| **AL-05** appearance ownership beyond DisplayLists | Color/material binding precedence across part/config/display-state | Out of scope (we don't touch appearance/material data) | No | Not relevant to our current scope. |

**Bottom line**: cadmpeg's open items are 37/41 about a subsystem (Parasolid B-rep, feature
history) we explicitly do not build, and are not evidence against or for any of our own claims. Of
the 4 that touch our territory, AL-03 (extended tessellation-table header) is the one concrete,
tractable, *new* question worth chasing in our own corpus.

---

## 5. Coverage they have that we don't

- Full Parasolid XT B-rep decode: typed topology records (bridges, edge-uses, loop heads,
  vertex-uses), analytic and NURBS surface/curve carriers, offset surfaces, constant- and
  variable-radius blends, swept/spun-to-NURBS conversion, validated intersection curves.
- Feature history / Keywords XML decode: extrusions (with Boolean-operation byte codes),
  patterns (linear/circular/mirror), drafts, fillets/chamfers as *history* (not just resulting
  geometry), sketch relations (dozens of numeric relation codes), equations with unit modes,
  configuration management (`Config-N-Partition`/`-Deltas`/`-ResolvedFeatures`, `SourceIndex`
  binding, multi-configuration body membership).
- Document/container metadata: named `SW Objects` metadata records (bounding box, default
  reference plane, transformed reference planes, part identifier/version, configuration-manager
  minor version + FILETIME timestamp, linear-unit name string) with byte offsets.
- Appearance/material system: per-face, per-feature, and per-body-default color/material
  precedence rules, tied to persistent surface references.
- A documented, more precise **outer container format**: exact block marker bytes, CRC-32
  validation of decompressed payload, `wbits=-15` raw DEFLATE, a cache-cell section-index grid
  between blocks, and a tail OPC section directory with per-entry descriptor/trailer bytes — more
  detail on the *outer* envelope than we have published, even though we clearly also parse it
  successfully (our tooling works on 21 modern files).
- Version dialect distinction (`sw-version-pre-12000` vs. `sw-version-12000-plus`).
- A write path (round-trip / patch / regenerate), which we have never attempted (we are read-only
  by design, per README: "This...implements the validated read-only path").
- Multi-format context: 10 other CAD formats decoded by the same architecture (IR, validators,
  exporters), which could be a source of cross-format technique (e.g., how they solve the
  analogous tessellation-to-B-rep face-matching problem in Inventor or CATIA) if useful later.

We were not able to verify whether cadmpeg documents SLDASM (assembly) handling at all — it did
not surface in any of the fetched pages, and the format list in `README.md` names only `.sldprt`,
not `.sldasm`, among SolidWorks entries. Treat SLDASM coverage as **unknown, not confirmed absent**.

---

## 6. Reliability verdict and license

**License.** Code: Apache License 2.0. Documentation and specifications, including
`docs/formats/sldprt.md` and `sldprt-open-items.md`: **CC BY 4.0**, with the explicit in-document
notice "Attribute to the cadmpeg project." CC BY 4.0 permits reuse (including commercial and
derivative use) with attribution, so **we may reuse or quote cadmpeg's specification text**,
crediting the cadmpeg project, if we choose to. Trademark note from their `README.md`: "SolidWorks
... and other product names are trademarks of their respective owners... cadmpeg is an independent
project and is not affiliated with, endorsed by, or sponsored by any CAD vendor" — the same
disclaimer posture we should presumably maintain ourselves.

**Reliability verdict.** cadmpeg's SLDPRT work is broader, more architecturally ambitious, and
backed by more real engineering infrastructure (a Rust codec, a golden test suite, a
machine-checked layout table, a documented contribution/provenance policy) than a first read of
the specification prose alone would suggest. But the specification document itself, as fetched,
is **not written as evidence** — no hexdumps, no per-file counts, no falsification controls, no
bibliography, and (on the one point of direct byte-level overlap with our own most-scrutinized
finding, Block1/"List B") a claim ("finite f32 values") that is weaker and less tested than our
own (u32 edge-ID tokens, corroborated by an edge-shuffle falsification control showing 44,640
exceptions). Where cadmpeg and our project overlap on hard structural facts (the 6-array table
order and its arithmetic, DisplayLists units), they **agree**, which is mild independent
corroboration of our own INV-018/020. Where cadmpeg goes further (Parasolid B-rep, feature
history), it is doing work fundamentally out of our scope, and we have no basis in the fetched
text to judge its correctness there — we can only note that a real test suite exists for it,
unverified by us. Treat cadmpeg's SLDPRT spec as a **credible, larger-scope peer project with a
real implementation behind it, but do not treat any single uncorroborated sentence in
`sldprt.md` as verified** — none of the sentences we could check came with in-document evidence,
and one interpretive claim (List B as float, vs. our integer edge-ID model) directly conflicts
with our best-tested invariant.

---

## Top 3 actionable items for us

1. **Check our corpus for the "extended" `uoTempFaceTessData_c` table-header form (AL-03).** Our
   parser (`parser/v0.2/src/parser-core.js`) assumes the descriptor table starts immediately after
   the strip-length precursor array's header words, with no intervening triangle/strip-count
   header or 40-byte extended prefix. If any current or future file uses cadmpeg's described
   extended form (`+8/+12/+16/+20` = `1,0,0,<nonzero token>`, 16 zero-bytes, descriptors at `+40`),
   our strict header check (`Unexpected array header at <offset>`) would reject that face outright
   — worth a scan of the 21-file corpus (and especially any file outside it) for this exact byte
   pattern before assuming universal coverage.
2. **Re-examine the Block1/"List B" interpretation question directly, since it's now a named
   external disagreement.** Our edge-ID interpretation is far better tested (falsification control,
   downstream metadata match on 1,272/1,272 faces) than cadmpeg's one-line "finite f32" claim, but
   it costs little to explicitly document *why* the float interpretation is rejected (most of our
   integer values, reinterpreted as f32, are indeed "finite," making cadmpeg's stated test
   non-discriminating) — this closes a plausible future criticism before someone else raises it.
3. **AL-01's persistent-surface-reference idea (`ATOM_ID_2001`/`SurfIdRep`) is a genuinely new
   candidate mechanism**, worth keeping in mind for `NQ-030`/`NQ-032` (surface tags 4005–4009,
   edge-type families): if we ever get independent ground truth for those tags, a persistent-ID
   string-matching approach (rather than numeric tag matching) is a second, independent method
   cadmpeg apparently relies on for the analogous problem, and cross-checking against it (if a
   comparable persistent identity turns up in our own forward-metadata bytes) could add a second
   line of evidence.
