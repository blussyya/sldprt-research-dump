# EXP-106: blind disprove of `meshResidual` tie-break (select.js at 705b69b)

## Verdict: holds, for the sets tested

No pick was wrong among non-identical candidates. Every order-dependent pick was between candidates with identical geometry. Two failure modes were found, neither reached by the corpus: a silent stack overflow above about 10,000 display faces, and a silent skip of zero-vertex display faces.

## Claim under test

`meshResidual` gives each display face its own B-rep face (one-to-one). It takes the smallest worst vertex distance any assignment reaches, then the smallest worst normal angle within it. Candidates are ranked by that residual. The pick is the shape the display shows, in any candidate order, except for identical-geometry candidates.

## Measured

**Code read (705b69b vs 517476c).** The new code assigns with Kuhn's augmenting paths and then takes two thresholds (distance, then angle) by binary search over the sorted values. `better` is a lexicographic key: in-band (pos <= 1e-8) by angle, else by pos. That key is a strict weak order, so the first candidate in order wins only on exact key ties.

**Control: existing tests.** `SLDPRT_CORPUS=/home/user/sldprt-research-dump node --test test/select.test.js`: 3 of 3 pass.

**Control: the old code is different.** 517476c takes the worst of each display face's best surface, with no one-to-one constraint. On SW2011 it picks C03 for C18 (split-line cube). HEAD picks C18. This is the EXP-102 fix, and it changes the pick.

**SW2011 all-pairs** (`sw2011_allpairs.js`, output `sw2011_allpairs.json`). 25 parts. Each part X is the display. Candidates are all 25 B-reps. Truth is X's own name. 12 orders per part: forward, reverse, 10 seeded shuffles.
- HEAD picks X in 19 of 25. OLD in 18. FULL (all vertices, all surfaces checked) in 19.
- HEAD differs from FULL on 0 parts. HEAD differs from OLD on 1 part (C18).
- 15 parts have more than one fit. Of those 15: 12 pick X exactly, 3 pick a geometry twin, 0 pick a non-identical wrong shape.
- The 3 twins: C22 picks C00, C25 picks C13, C26 picks C04. Each pair is identical geometry: same vertices, same face surfaces, same edge count (`identity.js`). The C04-vs-C03 control correctly reports not identical.
- 6 parts change pick across orders. All 6 are inside the 3 identical pairs (C00/C22, C04/C26, C13/C25).
- 3 parts (C14 sphere, C15 torus, C16 loft) have no fit at all. Their own body fails the box or face-count test, so `meshResidual` never runs. They fall back to the lowest ID. This is a box-test miss, not a ranking result.

**Corpus sweep** (`sweep.js`, output `results.jsonl`, summary from `analyze.js`). 222 SLDPRT files walked under `/home/user/sldprt-research-dump`, excluding `package/`. 213 skipped: 205 with one partition, 8 with no Config-N-Partition stream. 9 files have two or more partitions.
- Picks: HEAD, OLD and FULL agree on all 9.
- 4 files tie on box and faces (629adcec, 70477058, 516a7dc5, afc71d14). In each, all tied candidates are identical geometry (`identity.js`) and residuals agree to every digit. Their order-dependent picks are therefore inside the claim's exemption.
- 118a3cb0 has 1 fit (Config-268), which matches the documented correct config.
- 289756ce has 1 fit (Config-21) and 300f9732 has 0 fits (the documented 2.5e-8 m pad miss).
- 03afebf4 and c613782b have one fit each, and it equals the Header2 active config. This is 2 of 2 on the header truth, but neither exercised the residual.
- Non-identical ties decided by the residual in the real corpus: 0.

**Recursion and complexity** (`depth.js`, synthetic chain of planes that forces an augmenting path through all N faces; live HEAD `meshResidual`).

| display faces N | time | result |
|---|---|---|
| 50 | 6 ms | ok |
| 500 | 60 ms | ok |
| 2,000 | 525 ms | ok |
| 5,000 | 3.2 s | ok |
| 10,000 | 11.2 s | RangeError: Maximum call stack size exceeded |

The growth is about N squared, not exponential. The overflow is inside `meshResidual`. `choose` wraps the call in try/catch and sets `residual={pos:Infinity}` for that candidate. A candidate that overflows loses silently, and an all-overflow tie falls to the lowest ID. I did not build a real B-rep that reaches this path in `choose`. The largest display in the corpus has 92 faces.

**Zero-vertex faces.** `meshResidual` skips a display face with no vertices (`if(!n)continue`) and drops it from the matching. No display face with zero vertices occurs in any tie-relevant file (9 files checked) or in the 25 SW2011 parts. The path is untested.

**Timing of the 67 s call on 118a3cb0.** The time is in `choose`, not in the build (build 147 ms). Per candidate, most cost is in `brepBox`. Two 30-face candidates take 29.5 s and 27.4 s. The other 23 take 0 to 18 ms. Ranking is not reached (only one fit). This is cost in `brepBox`, not an exponential in the assignment. I did not profile inside `brepBox`.

## Counterexamples

- Wrong pick between non-identical candidates: none found.
- Silent wrong pick from the recursion overflow: possible in principle at about 10,000 display faces. Not reached by any corpus part, and not reached by `choose` in a test.
- Order-dependent pick between non-identical candidates: none found.

## Not checked

- Real parts with more than about 2,000 display faces. None in the corpus.
- Real B-reps with zero-vertex display faces.
- Coplanar, mirrored, and symmetric-hole shapes beyond the SW2011 set. The set has cubes, holes at several sizes and positions, one split line, and one chamfer. No mirrored-feature pair was built.
- The prefilter (`PREFILTER`, `NEAR`) and per-face sampling are checked only by the FULL variant on these sets. A case where the true surface sits outside the 3 nearest and beyond 1e-6 was not built.
- Real multi-config parts where the residual decides between non-identical shapes. The corpus has none. Only SW2011 exercises it.
- Identity was checked by vertex set, face surface and edge count. A shape that matches on all three and differs only in topology was not searched for.
- No prove agent was run. This is one disprove pass.
- Nothing committed. The coordinator's note said the files were committed; I did not run git, per the task rules. `knowledge/evidence/scripts/EXP106/` holds the files.

## Scripts

- `gen_variants.js`: writes HEAD, OLD (517476c) and FULL variants with absolute requires.
- `select_517476c.js`: old source from `git show 517476c:src/parasolid/select.js`.
- `sweep.js`, `results.jsonl`, `analyze.js`: corpus sweep.
- `sw2011_allpairs.js`, `sw2011_allpairs.json`: SW2011 all-pairs.
- `identity.js`: identical-geometry check and 118a3cb0 timing.
- `timing118.js`: per-candidate timing and zero-vertex count.
- `depth.js`: synthetic recursion depth.
