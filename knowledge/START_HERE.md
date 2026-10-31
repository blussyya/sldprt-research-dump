# Start here

This is the briefing for anyone, person or agent, picking the SLDPRT work up cold. Read it first,
then `RESEARCH_HANDOFF.md` (where things stand) and `NEXT_QUESTIONS.md` (what's open).

Last brought up to date 2026-11-01, after EXP-086.

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
| `solidworks-converters` | the converter code (Node, no dependencies), `npm test` | `dev`; the user merges `dev` into `main` |
| `solidworks-mcp` | a separate SolidWorks automation server, not part of this research | leave it alone |

`rollback-bringup`, if it turns up, is an old copy of the docs repo. Ignore it.

## How work is done

1. **Pick the next item** from `RESEARCH_HANDOFF.md` ("To fix") or `NEXT_QUESTIONS.md`.
2. **Find out, cheaply.** Write a small script under `knowledge/evidence/scripts/EXPnnn/` that
   loads the part and looks at one thing. Hand bulk reading or corpus sweeps to cheap subagents
   (Haiku) in small chunks, and check what they bring back.
3. **Change the converter** on `dev` only when the cause is understood, not to make a number pass.
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
7. **Commit and push** each repo from the local terminal (`git push`). The converter's commits go
   to `dev`. Nothing should be left only on the local machine or in a scratch folder.

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
- **Writing voice.** Anything front-facing (evidence, docs, READMEs, commit messages) is written
  plainly, the way a person would say it: short sentences, verbs, real numbers, no hype words. In
  Claude Code, load the `anthropic-skills:human-sound-everyday` skill before writing. No
  attribution lines in commits.

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

## Where things stand (2026-11-01)

- 133 of the 139 online-sample parts resolve. 5 have no partition stream, so there's no body to
  read. `2f121983` still stops, and `82981f2a` resolves but takes about 20 minutes.
- 130 resolve with every fit within 1e-8 m by the fitter's own check. Over it:
  - `3c4752f1`: 3.95e-8, two plane × blend edges where the blend touches the plane.
  - `2e6e140a`: 2.7e-8, one SP_CURVE edge.
  - `f0b9a118`: 1.6e-8, one SP_CURVE edge.
- `82981f2a` passes the fitter's check, but a dense check finds edge 826 at 1.12e-8 m.
- The tests pass: 61, 2 skipped.

Verified format facts from EXP-086, each having survived a blind check:

- An OFFSET_SURF lies along its basis's normal, reversed by a `-` sense. Which sense flag it reads
  isn't settled, since they always agree in the sample.
- Past the end of its knot range, a B-spline surface carries on flat along its edge tangent.

## Next, in order

1. A denser fit check, so errors like edge 826's (1.12e-8 m mid-curve, unseen by the fitter's few
   samples per interval) are caught.
2. `3c4752f1`: two plane × blend edges where the blend touches the plane (another touching end).
3. The SP_CURVE edges on `f0b9a118` and `2e6e140a`.
4. Accuracy within about 1 µm of a T limit. head_back blend 9931's spine is up to 7.5e-8 m off there,
   because the support blend's own fitted spine (5e-12 m) is magnified, and the fitter's error
   doesn't show it.
5. `2f121983`: a blend spine on two offset swept surfaces. The foot jumps near the start.
6. Vertices 0.1 to 1 mm off thread and degree-1 surfaces, inside the knot range, in 5 parts
   (`d799e9a3`, `073482d3`, `0d68d32d`, `db8a97e2`, `f0b9a118`).

Also still open: NQ-057, the B-rep triangulator on 32 parts.
