# SLDPRT Format Research — Working Dump

This repository is a working dump of all local research files for the SLDPRT reverse-engineering project. It mirrors the local working directory and is used to back up experiments, evidence, and knowledge as they are produced.

**Main research repo:** [sldprt-format-research](https://github.com/blussyya/sldprt-format-research)

## Knowledge Base

The project-wide knowledge base is maintained under `knowledge/`:

| File | Purpose |
|------|---------|
| `KNOWN_INVARIANTS.md` | Verified structural properties demonstrated across the corpus |
| `EXPERIMENT_LOG.md` | Ledger of every experiment with facts, hypotheses, and confidence |
| `FAILED_HYPOTHESES.md` | Hypotheses that have been disproven |
| `OPEN_QUESTIONS.md` | Broad unresolved questions |
| `NEXT_QUESTIONS.md` | Concrete operational research queue |
| `ASSUMPTIONS.md` | Working assumptions |
| `FORMAT_TIMELINE.md` | Version and container observations |
| `EVIDENCE_PRESERVATION_POLICY.md` | Rules for reproducible evidence |
| `evidence/` | Archived raw experiment outputs |
| `RESEARCH_DASHBOARD.md` | Current research posture |

## Research Versions

| Version | Description |
|---------|-------------|
| v0.3.5 | Evidence preservation policy, knowledge base restructuring, evidence archive |
| v0.4.0 | Three verified structural invariants (I1/I2/I3), EXP-011, corpus analysis |
| v0.4.1 | Rewrite system analysis — position-dependent VALUE mapping discovered |
| v0.4.2 | Invariant stress test across 8 files (1,232 faces). INV-012 formula found incorrect. |
| v0.4.2a | Reviewer criticism audit. Circularity confirmed, DEKOR discrepancy resolved, INV-018 dependency proven, INV-012 formula corrected. Non-circular validation, independent parser reproduction, expanded corpus test. |
| v0.4.3 | Independent face extraction (EXP-018), normal/layout falsification (EXP-019), geometry validation (EXP-020, blocked), alternative [4,8,2,N] header investigation (EXP-021). N=2 prev_edgeCount claim falsified. |
| v0.4.4 | Global container survey (EXP-022), alternative header characterization (EXP-023), rejected candidate audit (EXP-024), serialization primitive frequency (EXP-025). Critical review of EXP-022-025 methodology. |
| v0.4.5 | Corrected rerun of EXP-023/024 with the Block1→Block2 offset bug fixed. Block2 header valid 1,172/1,172; `secCount` non-degenerate; EXP-024 VALID = 1,172; INV-016/017/018 pass 100%. |
| v0.4.6 | EXP-026 counterexample hunt for the secCount/alternative-header correlation. 0 counterexamples in 1,172 faces; recorded as INV-019 (correlation, not causal). |

> **Note:** The `v0.5` slot was an implementation (a parser), not a research version. It now lives under `parser/v0.1/` — see below.

## Parser

The parser is versioned independently from the research progression and lives under `parser/`:

| Version | Description |
|---------|-------------|
| `parser/v0.1` | Read-only SLDPRT geometry parser & browser viewer, originally produced as research slot `v0.5`. Built on the validated state through v0.4.6; passes exact parity (1,172/1,172 faces) against the v0.4.5/v0.4.6 reference data. See `parser/v0.1/README.md` and `parser/v0.1/SUMMARY.md`. |

## Project Structure

```
sldprt-research-dump/
├── README.md
├── knowledge/                           # Project-wide research knowledge base
│   ├── ASSUMPTIONS.md
│   ├── EVIDENCE_PRESERVATION_POLICY.md
│   ├── EXPERIMENT_LOG.md
│   ├── FAILED_HYPOTHESES.md
│   ├── FORMAT_TIMELINE.md
│   ├── KNOWN_INVARIANTS.md
│   ├── NEXT_QUESTIONS.md
│   ├── OPEN_QUESTIONS.md
│   ├── RESEARCH_DASHBOARD.md
│   └── evidence/                        # Archived raw experiment outputs
├── parser/                              # Parser implementation (own versioning; not research versions)
│   └── v0.1/                            # Read-only SLDPRT parser & viewer (was research slot v0.5)
│       ├── src/                         # parser-core.js (isomorphic) + node-cli.js
│       ├── test/                        # Corpus parity + v0.4.5 reference comparison
│       ├── web/                         # Browser viewer (three.js/pako)
│       ├── README.md
│       ├── SUMMARY.md
│       └── package.json
├── step-tools/                          # SLDPRT → STEP comparison utilities
│   ├── compare.js
│   ├── sldprt-faces.js
│   └── step-parse.js
├── test files original/                 # Original .SLDPRT test files
├── v0.2.1/                              # Early converter prototypes
├── v0.2.2/
├── v0.3.0/                              # Pre-knowledge-base research
├── v0.3.1/
├── v0.3.2/
├── v0.3.3/
├── v0.3.4/
├── v0.3.5/                              # Evidence preservation policy era
├── v0.4.0/                              # Invariant discovery era
├── v0.4.1/                              # Rewrite analysis
├── v0.4.2/                              # Stress testing
├── v0.4.2a/                             # Audit & non-circular validation
├── v0.4.3/                              # Alternative header investigation
├── v0.4.4/                              # Container survey & critical review
├── v0.4.5/                              # Corrected EXP-023/024 reruns (B2 offset fix)
└── v0.4.6/                              # EXP-026 secCount/header correlation hunt
```
