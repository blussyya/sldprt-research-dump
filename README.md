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

## Project Structure

```
solidworks research/
├── README.md
├── LICENSE
├── diagnose.js                          # Diagnostic scripts
├── diagnose2.js
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
├── step-tools/                          # SLDPRT → STEP comparison utilities
│   ├── compare.js
│   ├── sldprt-faces.js
│   └── step-parse.js
├── test files converted/                # Extracted/converted output files
├── test files original/                 # Original .SLDPRT test files
├── untouched/                           # Archived untouched originals
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
└── v0.4.4/                              # Container survey & critical review
```
