# Prior Art — what else exists for SLDPRT and Parasolid

A map of other public work on these formats, compiled 2026-09-20/21.

**This file records what other projects claim and how they work. It is not evidence and nothing
in it supports any invariant.** Where a question raised here has been decided, it was decided on
our own corpus with our own code, and the result lives in `KNOWN_INVARIANTS.md` with its own
evidence. Several of those results came out differently from the claim that prompted them.

Read this as a field guide: what has been tried, what looks solid, what to avoid depending on.

---

## 1. The two routes into a SLDPRT

Everything in this space takes one of two paths to geometry.

| | tessellation route | B-rep route |
|---|---|---|
| source | `Contents/DisplayLists` | the embedded Parasolid partition |
| gives | triangle strips, per-face normals, surface type tags | exact analytic surfaces, trimming curves, real topology |
| loses | exact curves — a cylinder is facets | nothing geometric; costs a full XT decoder |
| this project | **our route** | opened as of EXP-056, header only |

Projects that take the B-rep route do not read DisplayLists at all, and vice versa, with one
exception that uses DisplayLists only for face appearance.

## 2. Projects

Licences as stated by each repository at the time of survey; confirm before relying on any of
them.

### SLDPRT

| project | language | licence | route | notes |
|---|---|---|---|---|
| cadmpeg | Rust | Apache-2.0 code, CC BY 4.0 docs | B-rep primary, DisplayLists secondary | 1,773-line format spec with a machine-checked offset table; documents the container far more finely than we do — block marker, CRC-32, raw DEFLATE, cache-cell grid, tail directory |
| solid-diff | — | **not confirmed**, no LICENSE found | B-rep | per-claim confidence markers in its docs; reports 99.0% mesh success over a 1,536-file vault |
| sldprt-export | Python | MIT | DisplayLists | closest overlap with us; also does assemblies and 3MF, which we do not |
| sldprt2step | Python, stdlib only | Apache-2.0 | B-rep | genuine `BODY→REGION→SHELL→FACE→LOOP→FIN→EDGE→VERTEX` parsing, no shell-out |
| sldprt2xt | Python | AGPL-3.0 | B-rep | claims verbatim X_T transcription; extraction mechanism not verified by us |
| openswx | C++20 | MIT | container/metadata only | no DisplayLists or Parasolid content found in it |
| swformat | Python | Apache-2.0 | metadata/sketches | geometry is a stated non-goal |
| step_converter | — | none stated | partition forensics | its own README disclaims a validated conversion |

### Parasolid XT

| project | language | licence | notes |
|---|---|---|---|
| parasolid-kit | Rust/Python | MIT + Apache-2.0 | most mature; CI, fuzzing, corpus tests; **refuses to ship Siemens catalogs** |
| ps-parser | Python | MIT | ships `assets/sch_13006.s_t` with no stated provenance |
| xt-parser | Rust | **none — all rights reserved** | WIP; notes describe a sibling effort built by decompiling the Parasolid kernel |
| sldkit | Rust/PyO3 | PolyForm Noncommercial from v0.2.0 | container parser calling parasolid-kit's engine |

## 3. The schema problem

The Parasolid XT documentation everything descends from is the *Parasolid XT Format Reference*,
October 2006, © UGS Corp., marked proprietary and mirrored rather than officially released. It
describes the node/index model, pointer resolution, variable-length node encoding, the delta
schema mechanism and field tables for the analytic surfaces.

Machine-usable schema **data** is a separate matter, and in the public ecosystem it is always one
of: sourced from a Siemens SDK by the user, of undocumented provenance, or derived from a
decompiled kernel. None of those is a clean dependency for this project.

**Our position:** do not take anyone's schema asset. Every file in our corpus declares
`SCH_3301247_33103_13006` and carries schema material in-band — the text form names a
`schema_embedding_map` — so self-description is the route to test before importing anything.
See EXP-056.

## 4. Historical origin

The oldest public source we could reach is Bryan Bishop's page (heybryan.org, pre-2015), which
identified the container as Microsoft structured storage and named a geometry stream:

> It usually has a name like Contents/DisplayLists__ZLB and presumably ZLB is some sort of
> format, extension, etc.

and, on decoding it:

> I haven't been able to figure that out yet.

So the stream was named there and nothing was decoded. The `__ZLB` suffix is legacy-era: it
occurs in **0 of 24** of our files, in raw bytes or in the decompressed directory. Our own name
comes from the modern container's own directory, where `Contents/DisplayLists` is present in
21 of 21 modern files.

Other historical sources are gone: the SolidWorks forum display-lists document, the 2013
StackOverflow thread on extracting visualization data, and daeken's SLDPRT repository (created
2015, empty). PRONOM registers the modern family as **fmt/1967**, 2015+, developer Dassault
Systèmes; its signature tab was not reachable.

The official route is SolidWorks Document Manager's `GetPartitionStream`, which needs a licence
and Windows, and the commercial route is ODA's MCAD SDK. Neither publishes a format spec, which
is why this work exists.

## 5. Where others are ahead of us

Recorded plainly, because it is useful to know:

- **Assemblies.** sldprt-export reconstructs them with transforms, nested subassemblies and
  companion-file fallback. We handle single parts only.
- **Container detail.** cadmpeg documents the block layer far more finely than we do.
- **B-rep.** Several projects read the Parasolid partition end to end. We read its header.
- **Scale of validation.** solid-diff reports a 1,536-file vault. Our corpus is 73 files, of
  which 49 are purpose-built.

## 6. Where we are ahead

- **Surface type tags.** 4001–4006 are identified and verified against SolidWorks-reported
  per-face ground truth (INV-025). These values appear in **no** surveyed project; the others
  resolve face identity by geometric fit against the B-rep or by persistent-ID matching.
- **Block1 edge-ID semantics.** INV-021's interior/boundary partition, its shared-ID
  correspondence and its falsification control. The one other DisplayLists reader treats that
  array as an opaque length-checked table.
- **Boundary-cycle topology.** INV-024.
- **A controlled corpus with per-face ground truth**, in two SolidWorks versions, with STEP,
  STL and both Parasolid forms per model. No surveyed project ships anything equivalent.

## 7. Notes on reading any of this

The surveyed documentation is uneven in a specific way: most of it states claims without showing
the bytes behind them. cadmpeg's 1,773-line spec contains no hexdumps, no named files, no
per-file counts and no bibliography, though its Rust golden tests presumably hold real evidence
we could not read. solid-diff is the exception, marking claims with its own confidence levels.

Treat every claim here as a hypothesis worth testing, never as a result to adopt. Three that we
tested came out against the source: a "finite f32" reading of Block1 accepts 100% of words and
so tests nothing; a documented Parasolid target path occurs in 1 of 21 of our files; and a
stream name taken from the historical literature does not appear in any modern file.
