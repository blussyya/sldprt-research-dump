# Dump reorganization plan (proposal, nothing moved yet)

The dump keeps every file ever used. This plan only moves folders, with `git mv` so history follows
them, and rewrites the relative paths that the moves would break. No file is deleted. That includes
the committed `node_modules` folders (14 MB) and `v0.3.0/tmp_*.bin`, since they were part of the runs.

## Today

28 entries at the root: 20 version snapshots (`v0.2.1` … `v0.4.9`), 6 tool folders (`parser`,
`converter`, `viewer`, `parasolid`, `step-tools`, `package`), the two corpus folders, `knowledge`,
and two loose scripts (`diagnose.js`, `diagnose2.js`).

## Proposed layout

```
sldprt-research-dump/
  README.md  LICENSE  LICENSE-CODE  NOTICE
  corpus/
    controlled/            ← "test files new"        (C00–C26, SW2011 + SW2022, with SolidWorks exports)
    original/              ← "test files original"   (real parts, 1997–2024)
    online/                ← new: openly licensed parts from GitHub, one or more per save year
                             2007–2026, each with source URL + licence in corpus/online/SOURCES.md
  experiments/             (the research snapshots, oldest first)
    v0.2.1/ v0.2.2/        first extractor and viewer (June)
    v0.3.0/ … v0.3.5/      display-list structure and STEP checks (June–July)
    v0.4.0/ … v0.4.9/      EXP-018 … EXP-065 (July–September)
    loose/diagnose.js, loose/diagnose2.js
  tools/                   (the readers that were later merged into solidworks-converters)
    parser/  converter/  viewer/  parasolid/  step-tools/  package/
  knowledge/               unchanged: the evidence log, invariants, questions, EXP075–EXP079 scripts
```

## Option to decide: keep the corpus folder names?

162 scripts reach the corpus through `test files new` / `test files original`, many of them as
`path.join(__dirname, '..', 'test files new')`. Two ways:

- **A (recommended): leave both corpus folders where they are, under their current names**, and only
  add `online/` next to them as `test files online/`. Every corpus path keeps working. Only the tool
  and experiment moves need path fixes.
- **B: rename to `corpus/…` as drawn above.** Cleaner, but every one of those 162 scripts and the
  `solidworks-converters` corpus finder (`test/helpers/corpus.js`, which looks for
  `test files new` and `test files original`) has to change in the same commit.

## Paths the moves break, and the fix

Moving a folder one level deeper (`v0.4.7/` → `experiments/v0.4.7/`) adds one `../` to every path
inside it that points out of it, and changes every path from outside that points into it:

| reference (count found) | example | fix |
|---|---|---|
| scripts in experiments → tools (`../parser/v0.1` ×20, `../../v0.1` ×5, …) | `require('../parser/v0.1/src/parser-core')` | `../../tools/parser/v0.1/…` |
| scripts in experiments → other experiments (`../../../v0.4.8` ×4, `../../../../v0.4.9` ×2) | | re-rooted through `experiments/` |
| `knowledge/evidence/scripts/*` → `../../../../parser/v0.3` etc. | | `../../../../tools/parser/v0.3` |
| scripts → corpus (`../../../test files new` ×3, plus `__dirname`-joined paths) | | only if option B |
| Markdown links into moved folders (22 files) | `[script](../v0.4.7/exp033….js)` | rewritten to the new path |

The rewrite is done by a script that resolves each relative path against the file's old location,
then re-relativizes it against the new one. So it is exact, not a search-and-replace guess.

## How it's checked

1. Before moving, every `.js`/`.py` file's resolved `require`/`open` targets are listed.
2. After moving and rewriting, the same list must resolve to the same files (now at their new paths).
3. Every Markdown link in the repo must resolve.
4. `solidworks-converters`' `npm test` (which reads the corpus from here) passes unchanged.
5. One commit on a branch, so the user reviews one diff. Nothing is pushed.
