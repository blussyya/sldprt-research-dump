# Start here

This is the briefing for anyone, person or agent, picking the SLDPRT work up cold. Read it first,
then `RESEARCH_HANDOFF.md` (where things stand) and `NEXT_QUESTIONS.md` (what's open).

Last brought up to date 2026-11-26, after EXP-118.

## The goal

A converter that turns SolidWorks parts (.SLDPRT) into STEP and STL, exact to the data in the file,
and a written-down account of the format good enough that someone else could write their own
reader. The STEP comes from the Parasolid body stored in the part. The STL comes from the display
mesh SolidWorks saved, and from the body only when a part has no mesh.

## The repos

All four live under `sldprt reverse engineering/` and on GitHub under `blussyya`.

| repo | what goes there | branch |
|---|---|---|
| `sldprt-research-dump` | the source of truth for the research: every experiment (`knowledge/evidence/YYYY-MM-DD_v0.5-EXPnnn.md`), every script and output it used (`knowledge/evidence/scripts/EXPnnn/`), the logs, and the test corpus | `main` |
| `sldprt-format-research` | the format write-up (`format/`, `export/`, `research/`) and validation tools (`tools/`) | `main` |
| `solidworks-converters` | the converter code (Node, no dependencies), `npm test` | `main` |
| `solidworks-mcp` | a separate SolidWorks automation server, not part of this research | leave it alone |

`rollback-bringup`, if it turns up, is an old copy of the docs repo. Ignore it.

## How work is done

1. **Pick the next item** from `RESEARCH_HANDOFF.md` ("To fix") or `NEXT_QUESTIONS.md`.
2. **Find out, cheaply.** Write a small script under `knowledge/evidence/scripts/EXPnnn/` that
   loads the part and looks at one thing. Hand bulk reading or corpus sweeps to cheap subagents
   (Haiku) in small chunks, and check what they bring back.
3. **Change the converter** only when the cause is understood, not to make a number pass.
4. **Check for regressions** before committing: `npm test` in the converter, then the online-sample
   sweep against the last baseline:

   ```bash
   node sldprt-format-research/tools/resolve-sweep.js --converter solidworks-converters \
     --baseline sldprt-research-dump/knowledge/evidence/scripts/EXP086/resolve-after.txt \
     "sldprt-research-dump/test files online"/*/*.{sldprt,SLDPRT,Sldprt}
   ```

   It prints each part's worst fitted-curve and -surface error and lists any part that got worse.
   Run sweeps one at a time: two heavy runs at once starve each other, and a part times out that
   would pass alone (the spring `5f8e9db3` takes about 4 minutes, `82981f2a` about 20).
5. **Have a fresh agent try to break the claim** (see the rules below) before calling it verified.
6. **Write it up.** The experiment goes in the dump's evidence file and `EXPERIMENT_LOG.md`.
   Format facts go in `sldprt-format-research/format/`, export behaviour in `export/`, and the
   state of things in `research/open-questions.md` and `research/validation.md`. Add a line to the
   handoff log saying what the session did and what's next.
7. **Commit and push** each repo to `main`, signed (see the rules). Since 2026-11-23 all three repos
   work on `main` only; don't create other remote branches. Nothing should be left only on the local
   machine or in a scratch folder.

## The research rules

These come from the user and override any habit that conflicts with them.

- **Doubt everything, including your own findings.** A finding isn't verified until a subagent
  that knows nothing of how you got there has been told to break it, and can't. Give it the
  claim, the data paths and the code, not your scripts or reasoning, and tell it to write its own
  check (its own evaluator, a different constraint, a different sampling) and to hunt for
  counterexamples and other explanations. Write its verdict into the evidence file. "Partly
  debunked" is a normal outcome, and the docs then say exactly which part failed. On 2026-10-31
  this caught a wrong diagnosis (head_back), a doubled count (791 offsets that were 62 + 39
  distinct ones), an error the fitter's own check missed (edge 826), and a regression (the spring).
- **Visible doesn't equal exact.** Exports must match the file's data, not look right. A fit error
  is a number checked against a bar (1e-8 m for fitted curves and surfaces), and anything over it
  is reported as over, never rounded into "fine". Check exports against independent references
  (OpenCascade, SolidWorks' own STEP on the control parts, closed forms) before trusting them.
- **Nothing in a format is noise.** Every unexplained byte, count or residue gets traced to what
  owns it before drawing a conclusion. A chart point that misses a surface by 1 mm turned out to
  be a whole rule about how B-splines extend past their edge.
- **Don't tune a check until it passes.** If a fix needs its own measurement relaxed, stop and
  find what's actually wrong. Three tries at loosening the fit check on the T-limit spine were
  all wrong; the real cause was bad points being pinned into the fit.
- **Say when you were wrong.** Earlier claims that turn out false get corrected in place, with a
  note, not quietly replaced.
- **Git.** Sign every commit with the user's SSH signing key (`gpg.format ssh`, `commit.gpgsign
  true`); the user hands the key over at the start of a cloud session. Never print, copy or commit
  the private key. No attribution lines (no Co-Authored-By, no session links). Work on `main` only
  and don't create remote branches the user didn't ask for. The user's email is private: never
  put it in requests to outside services.
- **Scope.** Part files first. Assemblies and drawings wait until the part work is finished.
- **Writing voice.** Anything front-facing (evidence, docs, READMEs, commit messages) is written
  plainly, the way a person would say it: short sentences, verbs, real numbers, no hype words. In
  Claude Code, load the `sldprt-research-method` skill (`.claude/skills/` in this repo), which has
  these rules, the writing rules and the decoding and validation recipes. No attribution lines in
  commits.

## Tools that already exist

- `sldprt-format-research/tools/resolve-sweep.js`: resolves parts one per process and compares
  against a baseline. See its README.
- `knowledge/evidence/scripts/EXP086/`:
  - `hberr.js` resolves a part and lists every fit over 1e-8 m.
  - `edge1.js` fits one edge on its own and shows its blend, spine and vertex offsets.
  - `bsurf.js` and `spinefit.js` fit one blend face or spine on its own.
  - `offside.js` checks which side of their basis the offsets sit on.
  - `debunk1/` to `debunk4/` are the blind checks' own scripts.
- Loading a part in a script:

  ```js
  const R='…/solidworks-converters', S=require(R+'/src'), N=require(R+'/src/brep/native'),
        P=require(R+'/src/brep/procedural'), F=require(R+'/src/brep/fit'), G=require(R+'/src/geom/eval');
  const M=N.build(S.readBrep(file).parsed);   // faces, edges, vertices (Maps)
  const resolved=P.resolve(M);                // fits intersections and blends
  ```

## Where things stand (2026-11-26)

- 134 of the 136 real online-sample parts resolve. The other 5 of the 141 files, in `not-a-part/`,
  aren't SolidWorks files (4 are STEP text, 1 undecodable). `2f121983` still stops, and `f666f342` (head_face) doesn't finish in 2,400 s. head_back
  (`82981f2a`) resolves in about 14 minutes.
- 130 resolve with every fit within 1e-8 m. Since EXP-103 the fitter checks 8 more points per
  interval and counts a pinned end's gap to its vertex. Over the bar:
  - `f0b9a118`: 4.49e-4 m, edge 152's vertex that far off its curve (vertex tolerance 1e-6 m).
  - `0739c559`: 1.57e-4 m, edge 6075 (vertex tolerance 4.8e-5 m). These two refuse exact STEP.
  - `3c4752f1`: 2.53e-8 m, two plane × blend edges where the blend touches the plane.
  - `82981f2a`: surfaces 1.54e-8 m, four blends whose spines run to a T limit. Within a few tenths
    of a micron of the T point the exact spine can't be found to 1e-8 m, so the number isn't a
    measured accuracy either way (NQ-065).
- The converter's `main` has all of this (`dev` is merged and deleted; work goes straight to
  `main` now). The tests pass: 86, 2 skipped (2026-11-24).
- Every experiment through EXP-112 has had its blind prove and disprove checks, and the format
  pages carry the results. The checks of 2026-11-23 corrected EXP-099 (994 records without an
  id block, not 56), EXP-105 (its 1e-9 m bar was below float32 rounding) and EXP-110 (+128 isn't
  constant; the cone is narrower than the normals), and found two display record layouts the
  converter can't read metadata from (4,622 faces, NQ-071).
- 2026-11-24: the converter reads face IDs and tags from SolidWorks 2025/2026 saves (4,484 faces,
  EXP-116) and builds boundary cycles on seam faces (EXP-115). The 62 degree cone normals were cone
  apexes, not a bug (EXP-114). Off-surface display vertices are chord points, except the off-chord
  ones, which are points of tolerant B-spline edge curves (EXP-113).

- 2026-11-24: chainwheel's 141 faces without boundary cycles were a reader error in pre-2011
  control-0 strips (edge ids in a swapped order). Fixed by rule (converter 894360c); over the
  corpus (216 parts, 20,519 faces) every face with edge ids now closes (EXP-117, EXP-118).
- 2026-11-26: the two holes in head_face's display mesh (`f666f342` faces 75 and 448) are in the
  file: the B-rep bore face's second loop doesn't go round the bore (EXP-118). A community member
  is asked to re-save the part and run Check Entity. The file's display edge ids are shifted from
  the native ids in id ranges (NQ-075).

Verified format facts, each having survived a blind check (more in the format pages):

- The modern container is a ZIP archive in disguise. Undo the disguise and Python's zipfile and
  unzip read all 178 modern files (EXP-112).
- A display edge's type tag is its native curve class; Block3 marks smooth edge uses, open
  boundaries and a per-face flag (EXP-108, EXP-109, EXP-088).
- The bounding record's tail holds a plane flag and a normal cone about the outward normals
  (EXP-110).

- An OFFSET_SURF lies along its basis's normal, reversed by a `-` sense. Which sense flag it reads
  isn't settled, since they always agree in the sample.
- Past the end of its knot range, a B-spline surface carries on flat along its edge tangent.

## Next, in order

Part files first; assemblies and drawings wait until these are done (the user's call, 2026-11-23).

1. ~~`3c4752f1`'s two plane × blend edges~~: the curves are right; the over-bar number is the
   check scoring the undetermined 30 nm next to a touching vertex (EXP-120, folded into NQ-065).
2. NQ-067: the vertices far outside their tolerance on `0739c559` and `f0b9a118`. Check our
   surface evaluation at those points before blaming the file.
3. NQ-065: accuracy within about 1 µm of a T limit (head_back's four blends). It needs the nested
   spines fitted much tighter than 1e-10 m.
4. `2f121983`: a blend spine on two offset swept surfaces. The foot jumps near the start. It now
   stops with "no foot ... settled (8.7e-4 m off its normal)"; whether that's the same jump isn't
   checked.
5. NQ-069: `f666f342` (head_face) doesn't finish.
6. Vertices 0.1 to 1 mm off thread and degree-1 surfaces, inside the knot range, in 5 parts
   (`d799e9a3`, `073482d3`, `0d68d32d`, `db8a97e2`, `f0b9a118`).
7. NQ-070: the dense check makes parts with many intersection curves 2.6 to 3.3 times slower.

Also still open: NQ-071 (IDs for the 190 faces of the 140-byte layout), NQ-057 (the B-rep triangulator on 32 parts), NQ-066 (edge 844's vertex pair),
NQ-068 (gaps at intersection-edge ends), NQ-074 (bounds word +100 and the cone cosine), NQ-075
(display edge ids shifted in two 2013 files), and the
format remainders in NEXT_QUESTIONS' queue table (NQ-031, 032, 044, 060, 062 to 064).
