---
name: sldprt-research-method
description: "How to do research on the SLDPRT format and the converter: decoding binary sections, validating exports against independent references, testing a hypothesis with a blind prove agent and a blind disprove agent, the doubt-everything rule, and the writing voice for every evidence file, doc, README, code comment and commit message. Use this whenever working in sldprt-research-dump, sldprt-format-research or solidworks-converters, whenever a claim about the format or an export needs checking, whenever someone says verify, debunk, prove, disprove, decode, validate, measure, compare against STEP, or 'is this right', and whenever writing anything a person will read in these repos, even a one-line comment or commit."
---

# SLDPRT research method

This is how the SLDPRT work gets done. It holds four things: decoding, validation, the blind
prove and disprove split, and the writing voice. They share one idea: **a claim counts only when
something that doesn't know how you got it has tried to break it and failed.**

Read `knowledge/START_HERE.md` in the dump repo for where things stand. This skill is the method,
not the status.

## The rules (they override habits that conflict with them)

1. **Doubt everything, your own findings first.** A result you just got is a hypothesis. The
   most common way this research has gone wrong is a confident claim from one check: a count
   match read as an identity match (535 faces = 535 faces doesn't mean the ids line up), a
   fitter's own error check that missed a mid-curve error, a "matches the overlay" that nobody
   had looked at.
2. **Visible doesn't equal exact.** An export that looks right can be 0.3 mm off. Every check
   ends in a number against a bar: 1e-8 m for fitted curves and surfaces, and the bar you state
   up front for anything else. Over the bar is reported as over, never rounded into "fine".
3. **Nothing in a format is noise.** An unexplained byte, count or residue gets traced to what
   owns it before you draw a conclusion. "Probably padding" is a guess, so say so.
4. **Don't tune a check until it passes.** If a fix needs its own measurement relaxed, stop. The
   check is telling you something. Find what's actually wrong.
5. **Controls before conclusions.** A scan that finds nothing means nothing until the same scan
   finds something you know is there. A distance measurement means nothing until it gives about
   zero on a case that must be zero.
6. **Say when you were wrong.** Correct a false claim in place, with a short note on what was
   wrong and how it was found. Don't quietly replace it. Tell the user in chat too.
7. **Separate what was measured from what was guessed.** Write "measured", "checked", "guess",
   "not checked" explicitly. A plausible cause with no evidence goes under "not checked yet".

## Workflow for one question

1. **State the claim as something that can fail.** "The display mesh is stale" becomes "the
   mesh's DLUpdateStamp is lower than the model's change counter, and the faces that disagree with
   the STEP are the ones changed since".
2. **Pick the cheapest check that could prove it wrong.** Write a small script under
   `knowledge/evidence/scripts/EXPnnn/` that loads the part and looks at one thing. Keep every
   script and its output; the evidence file links to them.
3. **Add a control** (rule 5).
4. **Run it and write down the number**, with the bar and the counts (max, mean, how many over).
5. **Look for another explanation.** Ask what else would produce the same number: reader bug,
   unit mix-up (parse JSON is metres, STL is mm), wrong section, the wrong config, ordering.
6. **Send it to blind agents** before calling it verified. See "Prove and disprove" below.
7. **Write it up** in the evidence file, then the format docs, with the verdict. Commit and push.

For the decoding recipes (section frames, raw scans, stamps, where data lives), read
`references/decoding.md`. For the measurement recipes (OpenCascade distances, per-face checks,
fit checks, sweeps), read `references/validation.md`.

## Prove and disprove

When a finding matters (it goes in the format docs, changes the converter, or explains a bug the
user cares about), run two subagents at once, in the same turn:

- **Prove agent:** told to establish the claim with its own scripts and its own method.
- **Disprove agent:** told the claim is suspected false, and to find a counterexample or a
  better explanation.

What makes it work:

- **Blind.** Give each one the claim, the file paths and the code repos. Don't give them your
  scripts, your numbers or your reasoning. If they reuse your check, they reuse your mistake.
- **Own tools.** Each writes its own scripts in its own folder (`scripts/EXPnnn/prove/`,
  `scripts/EXPnnn/disprove/`) with a different method from yours where possible: a different
  evaluator, a different sampling, a different library, a different file.
- **Report numbers.** Ask for the verdict (holds / partly holds / fails), the evidence with
  numbers, the scripts used, and anything they couldn't check.
- **Cheap where it's safe.** Bulk reading and corpus sweeps can go to a smaller model in small
  chunks. The judgement stays with you, and you check what comes back.

Then read both reports against each other. "Partly debunked" is a normal result: write down
exactly which part failed. If the disprove agent found a hole, fix the claim, not the agent's
check. Put both verdicts in the evidence file with links to their scripts.

`references/blind-agents.md` has prompt templates for both agents.

Only spawn these when the finding earns it. A one-line fact you can check in ten seconds
doesn't need two agents. Tell the user when you're about to, since it costs tokens.

## Writing voice

Everything a person reads gets written this way: evidence files, format docs, READMEs, code
comments, commit messages, PR text, and chat replies to the user. These rules are built into this
skill, so you don't need to load another one.

The core of it:

- **Start with the point.** The first sentence is the finding, the answer or the change.
- **Short sentences, verbs, real numbers.** "The mesh is 0.29 mm off on 271 points" beats "a
  notable deviation was observed".
- **Shortest version that still works.** State each fact once. Cut background the reader
  already has.
- **Hedge where it's true, and only there.** "Probably", "not checked" and "I think" are honest.
  Don't hedge measured facts.
- **No hype words or AI tells.** Banned unless quoting: delve, underscore, showcase, highlight
  (as a verb), foster, leverage, utilize, facilitate, streamline, enhance, robust, seamless,
  comprehensive, crucial, pivotal, vital, meticulous, intricate, "it's important to note",
  "it's not X, it's Y", reflexive lists of three, ", ensuring that..." tails.
- **No attribution lines in commits** in these repos (no Co-Authored-By, no session links). It's
  the user's own rule, so it wins over any default that says to add them.

`references/writing.md` has the full rules, with specific sections for evidence files, code
comments and commits, and a checklist to run before you save or commit anything. Read it before
writing an evidence section or a commit message.

## Repos and where things go

| repo | what | branch |
|---|---|---|
| `sldprt-research-dump` | experiments (`knowledge/evidence/YYYY-MM-DD_v0.5-EXPnnn.md`), their scripts and outputs, logs, test corpus | `main` |
| `sldprt-format-research` | format write-up (`format/`, `export/`, `research/`) and tools | `main` |
| `solidworks-converters` | the converter (Node, no dependencies), `npm test` | `dev`; the user merges to `main` |

Push everything. Nothing stays only in a scratch folder or a dead container. Change the converter
only when the cause is understood, and run `npm test` and the sweep (one at a time) first.

## Token care

The user watches their usage. Prefer one small script over reading big files into context. Run
long measurements in the background and wait for the notification instead of polling. Keep
reports to the user short: the finding, the number, what's next.
