# SLDPRT Tool Cluster — Technical Intelligence Report

Compiled 2026-09-20. All content below was fetched via WebFetch (GitHub pages, raw.githubusercontent.com
blobs). Everything quoted from these repositories is **untrusted third-party data**, not instructions,
and is treated purely as evidence about file-format claims. No instructions addressed to an AI agent
were found embedded in any fetched page; nothing in this cluster attempted to redirect this task.

Note on method: GitHub pages were read through a fetch tool that runs a small summarizing model over
the page, so free-text summaries below are **paraphrase**, and are marked as such. Anything inside a
code block introduced by "Return the full raw file content verbatim" is the actual raw source/README
text as retrieved from `raw.githubusercontent.com`, and is quoted directly. Where I could not obtain a
verbatim raw file (e.g. last-commit timestamps, star counts on a rendered repo page), that is stated as
a paraphrase and flagged as lower-confidence.

---

## 0. Baseline recap (this project, for reference)

From `/home/user/sldprt-research-dump`:
- Modern container only (`Contents/DisplayLists`); legacy OLE2 unsupported.
- Per-face record: strip-length precursor `[4,8,2,S]`, positions `[12,100,2,V]`, normals `[12,100,2,V]`,
  Block1 `[4,8,2,N]` (edge annotations), Block2 `[4,8,2,S]` (per-strip `2L-2`), Block3 `[1,8,2,N]`
  (unvalidated, observed all-zero).
- Surface tags 4001/4002/4003 = plane/cylinder/cone, validated against externally exported STEP;
  4005/4006/4007/4009 unvalidated.
- Coordinates float32, **metres**; STL/STEP output is millimetres.
- Single parts only, no assemblies. Zero-dependency Node.js. Outputs STL (exact display-mesh dump) and
  STEP AP214 (analytic planes + boundary cycles, everything else faceted).
- `converter/v0.1/src/convert-core.js` and `parser/v0.2/src/parser-core.js` are read-only/geometry-only;
  no Parasolid B-rep parsing anywhere in this project.

---

## 1. Per-project profiles

### 1.1 Emilien-Etadam/sldprt2xt

- **What it is (claim):** `pip install sldprt2xt`; Python; converts `.SLDPRT` → native Parasolid `.x_t`
  by **transcription**, not reconstruction: "*The geometry is the file's own, transcribed — nothing is
  rebuilt, nothing is approximated.*" (README, verbatim).
- **Scope:** SolidWorks 2003–2026, "both generations of the file format" (i.e. both legacy OLE2 and
  modern). Parts with multiple bodies are supported; the README's "31 attribute definitions... 49-body
  part" discussion implies multi-body single-part scope, not assemblies — assemblies are not mentioned
  as a target.
- **Dependency posture:** Claims to be standalone — "*every SolidWorks version known at its release...
  converts with nothing else installed*" — via a built-in Parasolid schema table (`schema_facts.py`,
  named but not fetched in raw form). For versions newer than the package or specific multi-body edge
  cases it accepts an optional `--donor` X_T file or a `--schemas` folder pointing at a real Parasolid
  `pschema` install, i.e. it can *optionally* lean on a real installation for schema completeness but
  does not require SolidWorks/COM/Document Manager to run.
- **Output fidelity claim:** Framed as re-emission of the original Parasolid stream data structures
  (not a fresh B-rep build), explicitly contrasted with a from-scratch reconstruction: "*producing STEP
  is a different job — rebuilding the geometry in a kernel rather than transcribing it — which this
  tool deliberately does not do.*" I could not independently verify byte-identity to a SolidWorks-native
  `.x_t` export; that is the author's own framing, not a demonstrated diff.
- **Maturity (paraphrase, lower confidence — rendered page, not raw):** AGPL-3.0, 11 commits on `main`,
  0 stars/0 forks, has `.github/workflows` CI and a `tests/` directory, published on PyPI. Exact last
  commit date not surfaced by the fetch.
- **Extraction mechanism:** README does not document stream names/offsets/magic bytes for how it locates
  the Parasolid data inside the container; that lives in unread source (`schema_facts.py` and the actual
  extractor module were not fetched).
- **Verdict:** Independent, standalone claim, not a wrapper — but the "byte-identical transcription"
  claim is asserted, not demonstrated in anything I could read.

### 1.2 BlinkingSun/sldprt2step

- **What it is (claim):** Pure Python 3.9+, **stdlib only** — "*Nothing to compile, no binaries, no
  third-party packages, no network access.*" Genuinely parses Parasolid XT B-rep and **rebuilds** STEP
  AP214 geometry (not tessellation, not a wrapper): "*It is a real Parasolid XT neutral-binary reader,
  not a mesh dump or a preview extractor*"; walks `BODY → REGION → SHELL → FACE → LOOP → FIN → EDGE →
  VERTEX` and maps analytic surfaces (plane/cylinder/cone/sphere/torus/B-spline/swept/spun/offset) and
  curves exactly; blend/intersection curves are approximated by interpolated B-splines and reported as
  `warnings`.
- **Container extraction — verified from raw source, not just the README:**
  - `sldprt2step_lib/container/ole_cfb.py` — legacy OLE2/MS-CFB path (SolidWorks ≤2014); "*Model data
    stored in `Config-N-Partition` streams with GUID-wrapped partition and delta transmits*"
    (paraphrase of `container.py`'s module docstring).
  - `sldprt2step_lib/container/sw3d.py` — modern (2015+) path: "*SW3D flat sections* ... zlib-compressed
    sections marked by specific byte sequences," with a `Sw3DStorageParser` that scans for section
    markers and Parasolid content detected via magic strings **`"P_S_"`, `"PARA"`, `"PS-P"`**, plus a
    fallback on a `"TRANSMIT"` marker in the payload; it also handles double-compressed (nested zlib)
    sections.
  - This is real, source-verified extraction logic distinct from a shell-out — no subprocess or external
    binary calls appeared anywhere in the fetched module summaries.
- **Base Parasolid schema:** `SCH_13006`, "plus the embedded edit scripts" (README, verbatim).
- **Scope:** Parts only, no assemblies/drawings. Sketches/features/PMI not carried over — B-rep only.
  Deterministic output (no timestamp) for reproducible builds.
- **Known weakness disclosed by the author:** "*Uncapped decompression* ... a deliberately crafted 'zip
  bomb' part could exhaust memory" — an honestly-flagged limitation, a positive maturity signal.
- **Maturity (paraphrase, lower confidence):** Apache-2.0, only 1 commit visible on `main`, 2 stars,
  0 forks, no visible CI workflow, but does ship `tests/gate.py` (packaging + real-file conversion gate)
  and `tests/fuzz.py` (malformed-input fuzzing) — test *infrastructure* exists but ships with **no
  sample parts**, so its own gate has not (as far as visible) been run against a real corpus in CI.
- **Verdict:** The strongest claim of genuine from-scratch Parasolid→STEP reconstruction in this cluster,
  and the only one where I could confirm from raw source that it is not a wrapper or a mesh dumper. Low
  commit count and no shipped sample corpus temper confidence in "it actually works" beyond the author's
  own description.

### 1.3 XRTC5/sldprt-export — see §2 for the full claim-by-claim diff

- Python (+ JS viewer), MIT license (own code only). Reads modern `.SLDPRT`/`.SLDASM` display mesh via
  `Contents/DisplayLists`/`FaceTessellations`, exports STL/3MF, includes a FastAPI browser viewer with
  section views and measurement snapping, and **explicitly supports assemblies** (component placement/
  transform reconstruction, nested subassemblies, missing-mesh fallback to companion part files).
- Also documents, in `container.py`, a **block/container layer** underneath DisplayLists: modern
  `.SLDPRT` is described as a flat sequence of blocks each starting with signature `14 00 06 00 08 00`
  (bytes `[20,0,6,0,8,0]`), header fields `type_id/crc32/comp_sz/uncomp_sz/pre_sz`, and **nibble-swapped**
  block names (each byte's nibbles swapped) that decode to plain paths like `Contents/DisplayLists`. It
  also documents a decoy pattern that reuses the same 3-word marker for a "cache-cell section-index
  grid" ("`checksum == expanded*2 and compressed == expanded//2`") that must be skipped, not treated as
  a real block.
- Attributed sources (from the code, verbatim): "*Container layout is from the cadmpeg project's
  published specification, `docs/formats/sldprt.md` (CC BY 4.0)*"; "*The six-descriptor strip tables in
  `savedmesh.py` are not in that document; they were worked out by a colleague of RTC's, credited
  there.*" I did not find "blussyya", "sldprt-format-research", or "sldprt-research-dump" anywhere in
  the README, `blocks.py`, `savedmesh.py`, `tess.py`, `mesh.py`, `readers.py`, or `assembly.py` text I
  retrieved — the "colleague" is unnamed in the text I could see.
- **Maturity (paraphrase):** MIT, 26 commits, 0 stars/0 forks. `tests/` builds *synthetic* `.SLDPRT`
  fixtures for the container/reader/writer tests rather than shipping real CAD files, plus a JS test for
  the viewer's snapping index — a deliberate, stated choice to avoid false confidence from
  "reads-real-files-and-doesn't-crash" tests.
- **Cannot do:** Imported `.stp`/`.step` bodies are B-rep-only (no cached tessellation) and are named/
  counted, not silently dropped. Parasolid XT streams are present but "schema-locked (`SCH_3501251`)"
  and require the Parasolid SDK — i.e. this project explicitly does **not** attempt Parasolid B-rep
  parsing, only the display mesh.

### 1.4 schwitters/openswx

- C++20, **MIT license**, three components: `libopenswx` (parser library), `libopenbom` (BOM builder),
  `asmbox` (HTTP server + CLI). Claim (paraphrase of repo description): reads `.SLDPRT/.SLDASM/.SLDDRW`
  "without a SolidWorks installation, COM, or any Windows-only dependency."
- Documents both container generations: "modern chunk format (2015+)... detected via byte marker scan"
  and "OLE2 Compound Document format (2014 and earlier)... identified by magic bytes" (paraphrase).
  Extracted capabilities described: document type/version, custom properties, thumbnails, per-config
  data (mass properties, custom attributes, preview images), component references.
- **Important negative finding:** in the README content actually surfaced to the fetch tool, **no
  mention of `DisplayLists`, triangle strips, or Parasolid partitions appears at all** — this looks like
  a *metadata/property/BOM*-layer project, not a geometry-layer one. This directly bears on the "openswx
  as common ancestor" question in §4: on the evidence obtained, openswx's documented scope is the
  container directory/metadata layer, not the DisplayLists geometry records this project and
  sldprt-export decode. I could not rule out that geometry-layer detail exists deeper in the source tree
  (e.g. undocumented in the README) without reading raw source files, which a `docs/` listing attempt
  returned 404 for `tree/main/docs` (paraphrase: the docs path either doesn't exist at that path or the
  fetch failed) — this is a gap, not a claim that openswx has no geometry code.
- **Maturity (paraphrase):** 26 commits, 19 stars, 6 forks, 1 open issue, `.github/workflows` CI,
  regression tests (`asmbox_tests`, GoogleTest 1.15.2 fetched at configure time), Docker packaging, REST
  API. This is the most conventionally "maintained-looking" project of the six by these signals.

### 1.5 KenM76/swformat

- Python, **Apache-2.0**. Explicit non-goal stated up front: geometry is out of scope. Its own framing
  (paraphrase): "division of labor" — swformat handles metadata inspection/limited editing, "live
  SOLIDWORKS remains necessary for geometry operations and file authoring." It positions itself as a
  **replacement for SolidWorks Document Manager** (a paid, closed-source DLL) for read-only metadata
  work, not as a wrapper around it — Document Manager and the SolidWorks COM/Explorer API are named only
  as the incumbents it displaces, not as dependencies it calls.
- 5-layer architecture: bytes → chunks/streams (decompression) → CArchive (MFC serialization protocol)
  → Document API. Read scope: custom properties, configuration/sheet names, drawing metadata (sheets,
  views, tables, notes), sketch geometry (2D sketch entities, not 3D B-rep/mesh). Write scope: property
  editing and renames using a "span preservation" strategy — edited streams are kept at their original
  compressed size so offsets in the rest of the file don't shift, which the README claims SolidWorks
  itself will otherwise reject.
- **Maturity (paraphrase):** 5 commits, 0 stars/forks, has `.github/workflows/ci.yml` and a
  `test/harness/` suite. "As of June 2026" it explicitly does not support geometry round-trip: "probably
  impossible without external kernel" (paraphrase of the stated dev-status note).
- **No DisplayLists/mesh/Parasolid overlap with this project at all.** It never claims to touch 3D
  geometry, tessellation, or the B-rep stream.

### 1.6 Gecesars/step_converter — repo name does not match its own description

- The repository is titled `step_converter` on GitHub but its own README names the actual project
  **`sldprt-xmp-extractor`**, described (paraphrase) as "a local SolidWorks `.sldprt` partition-stream
  extraction and Parasolid reverse-engineering toolkit" with "diagnostic probes for studying the binary
  Parasolid transmit data offline." This matches the brief's warning that the repo name doesn't match
  the description given, and I confirm the mismatch directly from the fetched README.
- **It is not a STEP converter in the working sense.** Its own text says (paraphrase): it "does not yet
  perform a validated Parasolid-to-STEP solid conversion"; there is a "diagnostic STEP export path...
  for visual inspection of inferred candidate geometry, but it is intentionally separated from the real
  STEP exporter," and this diagnostic path requires OpenCascade bindings (an external CAD kernel) when
  available — i.e. for its one STEP-adjacent feature it explicitly reaches for a third-party geometry
  kernel rather than emitting STEP from its own B-rep model. The name in the task brief ("SLDPRT/XMP
  extractor doing Parasolid partition forensics") is closer to what this repo actually is than
  "step_converter" is.
- Its own conclusion on schema maps (paraphrase, notable epistemic caution): schema maps should be
  "treated as schema/layout metadata, not as direct face, loop, edge, or vertex topology" — i.e. the
  author is explicitly warning against over-reading structural metadata as geometry, which is a useful
  methodological note for anyone doing Parasolid partition forensics, including this project.
- **Maturity/status:** No license selected — its own README states "treat this repository as
  private/internal unless a license is added explicitly," which this report respects as a strong signal
  this is an unpolished personal research dump, not a released tool. 1 commit, 0 stars/forks. `tests/`
  reports "51 passed, 1 skipped" (paraphrase). Requires Python 3.13. File tree includes
  `bruteforce/`, `reverse_corpus/`, `samples/`, `logs/`, `out_with_ghost/` — directory names consistent
  with an active, exploratory reverse-engineering workspace rather than a finished product.

**Wrapper-around-SolidWorks-API flag:** None of the six projects is, on the evidence gathered, a thin
wrapper around the live SolidWorks API, COM, or Document Manager. swformat explicitly *replaces*
Document Manager for its scope rather than calling it. sldprt2xt optionally *accepts* a real Parasolid
schema folder as a fallback for version coverage, which is a soft, optional dependency, not a wrapper.
step_converter's one STEP-adjacent path optionally uses OpenCascade (a real geometry kernel, not
SolidWorks) and is explicitly disclaimed as not the real converter. None of the six requires SolidWorks
itself to be installed for their core claimed function.

---

## 2. sldprt-export deep dive — claim-by-claim vs. our project

Source used: `src/sldprt/savedmesh.py`, `blocks.py`, `tess.py`, `mesh.py`, `readers.py`, `assembly.py`
(raw file contents retrieved), plus README. Our source: `parser/v0.2/src/parser-core.js`,
`knowledge/KNOWN_INVARIANTS.md` (INV-020–024).

| # | Our claim | Their claim (quoted/paraphrased) | Verdict |
|---|---|---|---|
| 1 | Table signature `[4,8,2,S]` precedes positions; strip-length precursor array | `TABLE_SIGNATURE = struct.pack("<3I", 4, 8, 2)`; descriptor 0 = "uint32 per-strip vertex counts" | **AGREE** |
| 2 | Positions header `[12,100,2,V]`, float32×3 | Descriptor 1 = `(12, 100)` header, float32 positions, count `V` | **AGREE** |
| 3 | Normals header `[12,100,2,V]`, always present in our decode (we throw if missing) | Descriptor 2 = `(12,100)`, but `has_normals` property exists and their check allows `descriptors[2][1] not in (0, total)` → **normals may be absent** | **CONTRADICT (partial) / THEY-HAVE-MORE**: they explicitly model an absent-normals case; our parser requires normals on every face and errors out otherwise. We have not observed or handled a no-normals face. |
| 4 | Block1 `[4,8,2,N]`: per-edge annotation tokens, decoded semantics (leading control word, then per-edge IDs, 0 = interior, nonzero = shared boundary ID, INV-021) | Descriptor 3 = "uint32... per-strip extras" — read and length-checked (`descriptors[4][1] != strips` etc. — note their numbering: their descriptor index 3 is the `(4,8)` "extras" array, mapped by position, not by name) but **not decoded for meaning**; no ID/control-word semantics anywhere in `savedmesh.py` | **WE-HAVE-MORE**: they read the array's existence/shape as a validation gate; they do not decode edge-ID or boundary/interior semantics at all. |
| 5 | Block2 `[4,8,2,S]`, one entry per strip, value = `2L-2` (INV-020, corrected from the old `2L-3`/loop-size reading) | Descriptor 4 = "per-strip 2n-2", and `read_table()` asserts `struct.unpack_from(...)[j] == 2 * lengths[j] - 2` for every strip, strip-for-strip | **AGREE**, and strong independent corroboration of our *corrected* INV-020 formula (`2L-2`), not the old, wrong `INV-007`/`INV-012` "loop size" interpretation. They use the precursor array (descriptor 0) as the authoritative strip-length source and Block2 purely as a cross-check, exactly matching our current (post-EXP-042/046) design, not our old one. |
| 6 | Block3 `[1,8,2,N]`, N = Block1 word count, observed all-zero, semantics unknown | Descriptor 5 = "uint8... per-strip extras", read and length-validated but not semantically decoded | **AGREE on shape/status** (present, validated for count only, no semantics claimed by either side) |
| 7 | Triangle strip decode: alternating winding, strip of L verts → L-2 triangles | `triangles = sum(lengths) - 2*len(lengths)`; `mesh_from_tables()` alternates winding per triangle (`if k % 2: add_triangle(a,c,b) else add_triangle(a,b,c)`) | **AGREE** on the core strip-to-triangle algorithm |
| 8 | Coordinates float32, stored in **metres**; STL/STEP output in millimetres | `mesh_from_tables(..., scale: float = 1000.0)`; `mesh.py`'s unit-conversion doc (paraphrase): "converts from metres (used by SolidWorks and Parasolid) to millimetres, as expected by STL and 3MF formats" | **AGREE** — independent confirmation of the metres-not-millimetres finding, from an unrelated codebase |
| 9 | Surface tags 4001=plane, 4002=cylinder, 4003=cone (+ params validated against STEP), 4005/4006/4007/4009 unvalidated | No surface-tag, analytic-surface-type, or metadata-record decoding appears anywhere in the fetched `savedmesh.py`/`tess.py`/`readers.py`/`mesh.py`/`blocks.py`. Their scope stops at the tessellated triangle mesh. | **WE-HAVE-MORE**: sldprt-export has no equivalent of our forward-metadata/surface-tag decode (our INV-023) at all, as far as the fetched source shows. |
| 10 | Single parts only; no assembly support | `assembly.py` reconstructs `.SLDASM` assemblies: component placement/transform, nested subassemblies, fallback to companion `.SLDPRT` files for uncached meshes, rigid-transform validation, suppressed/hidden component tracking | **THEY-HAVE-MORE** — this is the single clearest capability gap: they solve the exact problem we explicitly scope out. |
| 11 | (implicit) container-layer extraction is reused, unvalidated, from `parser/v0.1` (our own README says so) | Documents a full block/CRC32 container layer (`blocks.py`) beneath `Contents/DisplayLists`, citing the cadmpeg spec, with an explicit, checked CRC-32-of-decompressed-payload per block | **THEY-HAVE-MORE** on container-layer rigor: their `Block.verify()` gives a cheap, strong correctness check (wrong offset/field/inflate → CRC mismatch) that our container extraction, by our own README's own admission ("reused unchanged from v0.1; it is NOT newly validated"), does not have. This is an actionable gap, see §6. |
| 12 | We decode the block/section-length tables fully (strip lengths from the precursor, corroborated via Block2) | They decode the same tables the same way, but treat descriptors 3 and 5 (our Block1/Block3) purely as opaque, length-checked "extras" | **WE-HAVE-MORE** on semantic depth of Block1; **AGREE** on Block2/precursor mechanics |

**Top findings from this section:**
1. No hard contradiction was found in the *core* strip/position/Block2 mechanics — independent
   corroboration of INV-020's corrected `2L-2` formula and of the metres-not-millimetres unit finding is
   the most valuable result here.
2. The one real discrepancy worth investigating is **#3, absent normals**: sldprt-export's code
   explicitly allows a face record with zero normals entries, something our parser has never seen and
   would currently throw on. Whether this is a real, reachable case (e.g. an older sub-generation of the
   modern format) or defensive code the sldprt-export author added without ever hitting it in practice is
   unknown from the README/source alone — worth testing against our corpus and any wider corpus we can
   get.
3. Assemblies (#10) and container CRC verification (#11) are sldprt-export's two genuine advances over
   us; surface-tag/edge-ID semantics (#4, #9) are ours over them.

---

## 3. Parasolid extraction: sldprt2xt, sldprt2step, step_converter

| | sldprt2xt | sldprt2step | step_converter (sldprt-xmp-extractor) |
|---|---|---|---|
| Stream/section location | Not documented in the fetched README; unread source (`schema_facts.py`, extractor module) | `Config-N-Partition` OLE2 streams (legacy) via `ole_cfb.py`; zlib-compressed "SW3D flat sections" (modern, 2015+) via `sw3d.py` | Not confirmed from fetched material beyond "partition-stream extraction" |
| Magic bytes / markers | Not documented | `"P_S_"`, `"PARA"`, `"PS-P"`, fallback `"TRANSMIT"` string match (from `sw3d.py`) | Not confirmed |
| Compression handling | Not documented | zlib, with an explicit double-decompression (nested zlib) fallback path when the first inflate doesn't look like Parasolid | Not confirmed |
| Output vs. SolidWorks-native X_T | Claimed **transcription**, not reconstruction — "the geometry is the file's own, transcribed"; byte-identity to SolidWorks' own export is asserted, not demonstrated in anything read | N/A — target is STEP, not X_T | N/A — no working STEP path claimed |
| Genuine B-rep parse vs. tessellate vs. shell-out | Reads/rewrites Parasolid partition structures directly (schema-table driven); not a tessellator | **Genuinely parses B-rep topology** (`BODY→REGION→SHELL→FACE→LOOP→FIN→EDGE→VERTEX`) and emits analytic STEP surfaces/curves; approximates only blend/intersection geometry via fitted B-splines, explicitly reported as `warnings`. No subprocess/external-binary calls found in any fetched module. Pure stdlib Python — this is the strongest, most verifiable "no shell-out" claim in the cluster. | Its one STEP-adjacent feature explicitly **defers to OpenCascade** (an external kernel) and is explicitly labeled diagnostic, not the real converter; the author's own words: it "does not yet perform a validated Parasolid-to-STEP solid conversion." |

**Conclusion:** sldprt2step is the only project of the three making a from-scratch Parasolid-B-rep→STEP
reconstruction claim that I could partially verify from raw source (real container/extraction code,
real topology-walk naming, no shell-out found). sldprt2xt's transcription claim is plausible but
unverified beyond its own README — I did not read its extractor or schema-table source. step_converter
is honestly self-described as not yet a working converter and, where it touches STEP at all, borrows an
external kernel rather than doing genuine B-rep reconstruction itself.

---

## 4. openswx as common ancestor — assessment

**What the evidence supports:** openswx documents and demonstrates the **container/metadata layer** —
distinguishing the modern (2015+) "chunk" container from the legacy (≤2014) OLE2 container, and reading
document type, version, custom properties, thumbnails, per-configuration mass-properties/attributes, and
component references. It is MIT-licensed, has 26 commits, 19 stars, 6 forks, CI and a GoogleTest-based
regression suite — by these signals it is the best-maintained project in the cluster.

**What the evidence does not support:** I found **no mention of `DisplayLists`, triangle strips, or
Parasolid partitions** in the README content the fetch tool surfaced. This means I cannot confirm, from
what I read, that openswx documents the *geometry* layer that this project, sldprt-export, sldprt2xt and
sldprt2step all work with. It may well exist deeper in the source tree (a `docs/` listing attempt at
`tree/main/docs` returned a 404, which could mean no such path, a different docs location, or a fetch
failure — I could not disambiguate) but on the material actually read, **openswx looks like the
common ancestor for container/OLE2-vs-modern format detection and metadata parsing, not for the
DisplayLists geometry decode** that is this project's and sldprt-export's actual subject matter. This
tempers the brief's working assumption; it should not be taken as settled without reading openswx's
source directly (not just its README).

---

## 5. Provenance audit

Classification key: **(A)** independently verified with fixtures/tests/hexdumps/reproducible scripts;
**(B)** inherited/cited from a named external source; **(C)** asserted without support.

| Project | Rough split | Notes |
|---|---|---|
| sldprt2xt | Mostly **(C)** for the transcription/fidelity claim (no fixtures or diff shown in what I read); **(A)**-flavored for version coverage claim only in the sense that it names a concrete mechanism (`schema_facts.py` + optional donor/schema override), not in the sense that I saw it demonstrated | No mention of cadmpeg, openswx, or this project |
| sldprt2step | Mix of **(A)** (real container/extraction source, `tests/gate.py` + `tests/fuzz.py` infrastructure, deterministic-output design) and **(C)** for the overall correctness claim, since it ships **no sample parts** to actually run its own gate against | No external format citations found in the README |
| sldprt-export | **(B)** explicitly and honestly for the container layer: "*Container layout is from the cadmpeg project's published specification... CC BY 4.0*", cited by name with a link. **(B)** again, but to an **unnamed** third party, for the strip-table mesh structure: "worked out by a colleague of RTC's, in a converter of their own." Everything else (assembly reconstruction, CRC verification, viewer) reads as **(A)**, backed by a real (if synthetic-fixture) test suite. | This is the most transparent citation practice in the cluster — it names cadmpeg outright and flags the second source as uncredited-by-name but explicitly not-original-to-this-repo. |
| openswx | **(A)** for what it documents (its own regression-tested container/metadata reads) | No citations to cadmpeg/this project/others found in the surfaced README text |
| swformat | **(A)** for its own metadata/property layer (real test harness, span-preservation claim tied to a concrete SolidWorks-acceptance behavior) | Out of scope for geometry entirely, so no format citations relevant to DisplayLists/Parasolid appear |
| step_converter | **(C)**/exploratory — no license, "treat as private/internal," own text warns against over-interpreting schema maps as topology; this is the most epistemically honest of the six about the limits of its own findings | No citations found in the fetched README |

**Search for our project's fingerprints:** I checked every README and every raw source file retrieved
above for the strings **"blussyya"**, **"sldprt-format-research"**, and **"sldprt-research-dump"**, and
for unattributed restatements of our specific findings (the `2L-2` Block2 formula, the `[4,8,2,S]`/
`[12,100,2,V]` headers, the metres-not-millimetres unit finding, the 4001/4002/4003 surface tags). None
of the three name strings appeared anywhere. The `[4,8,2,x]`-style headers and the `2L-2` strip-length
relationship **do appear independently in sldprt-export**, but that project cites its own, different,
named/unnamed sources (cadmpeg; an uncredited "colleague") for them — there is no textual evidence this
project's findings were copied from us, and the timeline/attribution given is internally consistent with
independent (or separately-sourced) discovery rather than lifting from this repository. I did not find
our surface-tag scheme (4001/4002/4003) or edge-ID/boundary-annotation semantics (INV-021) anywhere in
this cluster — that finding appears unique to this project among the six.

---

## 6. What we could take, and what we uniquely have

**What we could take (with license notes):**
- **sldprt-export's per-block CRC-32 verification** (`Block.verify()`, MIT) — a cheap, strong
  correctness check for our container-extraction layer, which our own README admits is "reused
  unchanged from v0.1... NOT newly validated." Adopting an equivalent check (if our container format
  carries an analogous checksum, which needs checking against real files) would materially raise
  confidence in `parser/v0.1`'s extraction step. MIT license permits reuse with attribution.
- **sldprt-export's/openswx's container-generation split (modern chunk vs. legacy OLE2, magic-byte
  detection)** as a design pattern for eventually adding legacy OLE2 support, which this project
  currently declines to handle at all. MIT (sldprt-export, openswx) — reuse is easy, license-wise.
- **sldprt2step's approach to reporting partial success** (typed error codes, a distinct exit code for
  "succeeded with approximations," refusal to write a truncated/empty output) is a good API-design
  pattern for our own converter's error handling, independent of any format knowledge. Apache-2.0.
- **Awareness of the SW3D/Parasolid magic bytes** (`"P_S_"`, `"PARA"`, `"PS-P"`, `"TRANSMIT"`) from
  sldprt2step (Apache-2.0) as a concrete lead for eventually locating Parasolid partition data ourselves,
  which is currently entirely out of our scope (`Config-0-Partition` is "unreadable/high entropy" per
  our own INV-001) — this suggests the signal may be findable via magic-byte scanning inside
  zlib-compressed sub-sections rather than at the whole-partition level.

**What we uniquely have (on the evidence gathered across all six repos):**
- Surface-type tagging (4001/4002/4003 = plane/cylinder/cone) with analytic parameters validated against
  externally exported STEP — not found anywhere else in this cluster.
- Per-edge boundary/interior annotation semantics (Block1/INV-021: control word + shared edge IDs across
  adjoining faces) — sldprt-export reads the same array but only as an opaque length-checked "extras"
  table; no other project in the cluster appears to touch this at all.
- The forward metadata grammar linking geometry to a surface record and edge-ID/type table (INV-023) —
  no equivalent found elsewhere in this cluster.
- A from-scratch, zero-dependency STEP AP214 writer that emits real analytic `PLANE` surfaces trimmed by
  recovered boundary cycles (not just facets) for our one validated surface class — sldprt2step is the
  only other project attempting analytic STEP surfaces at all, but from genuine Parasolid B-rep, a
  different and more complete source of truth than our display-mesh-derived boundary cycles.

---

## 7. Reliability ranking (most → least trustworthy as format documentation)

1. **sldprt2step (BlinkingSun)** — the only project where raw source directly confirms non-trivial,
   non-wrapper, non-shell-out format logic (container extraction with real magic-byte/section-marker
   detection, a named Parasolid base schema, a disclosed limitation). Low commit count and no shipped
   sample corpus are real caveats, but what's there is verifiable and internally consistent.
2. **sldprt-export (XRTC5)** — transparent, specific citation practice (names cadmpeg outright, flags
   the uncredited "colleague" source honestly), a synthetic-fixture test suite designed to catch
   plausible-but-wrong readers (its own stated rationale), and mechanics (`2L-2`, `[4,8,2,x]` headers,
   metres units) that independently corroborate this project's own corrected findings.
3. **openswx (schwitters)** — best conventional maintenance signals (stars, forks, CI, GoogleTest,
   Docker) and a clear scope statement, but the geometry/DisplayLists claim in the task brief is not
   supported by what I could read; ranked below sldprt-export/sldprt2step specifically for *this*
   comparison's purposes because its demonstrated scope (container/metadata) is adjacent to, not the
   same as, the geometry-format questions this report is centrally about.
4. **swformat (KenM76)** — honest, narrow, well-scoped claims (metadata/properties/sketches only,
   explicit non-goal on geometry) with a concrete, checkable claim (span-preserving writes, verified
   against real SolidWorks acceptance) — trustworthy within its stated scope, but that scope barely
   overlaps this project's geometry concerns.
5. **step_converter / sldprt-xmp-extractor (Gecesars)** — the most epistemically honest about its own
   limits (no license, "treat as private," explicit "does not yet... validated conversion," explicit
   warning against over-reading schema maps as topology) but by the same token the least a finished
   or demonstrated piece of format documentation; ranked here for honesty, not for delivered results.
6. **sldprt2xt (Emilien-Etadam)** — plausible and specific claims (schema-table-driven transcription,
   named base-schema fallback mechanisms, version range 2003–2026) but the one project in the cluster
   where I could not verify the actual extraction mechanism at all (stream names, offsets, magic bytes)
   from anything short of unread source files, and its central fidelity claim ("transcribed, not
   rebuilt") is asserted without any diff, hexdump, or test evidence I could see.

---

## Gaps and caveats in this report

- All "maturity" figures (stars, forks, commit counts, last-commit dates) came from a summarizing fetch
  over rendered GitHub pages, not from the GitHub API — treat exact counts as approximate and exact
  dates as unknown where marked "not stated."
- I did not read: sldprt2xt's actual extractor/schema-table source; openswx's C++ source beyond its
  README (the `docs/` directory 404'd on one attempt and was not retried via another path); step_converter's
  source beyond its README-level description. These are the natural next steps if deeper verification is
  wanted.
- No content addressed to an AI agent, and no instruction to deviate from this task, was found in any
  fetched page.
