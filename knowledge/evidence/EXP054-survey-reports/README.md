# EXP-054 survey reports — working notes, NOT evidence

These five files are raw output from automated surveys of third-party projects, retained for
traceability. They are **unverified**. They summarise what other repositories *claim*, filtered
through a fetch-and-summarise pipeline that can and did drop nuance.

Nothing here should be cited as a finding. Every claim that survived into the project's
knowledge base was re-tested locally against our own corpus first; those results, and only
those, live in `../2026-09-20_ecosystem-survey-EXP054.md`, with reproduction scripts in
`../scripts/EXP054/`.

Two corrections made during verification, as a caution about reading these directly:

- `historical.md` infers an "attribution gap" — that this project took the DisplayLists stream
  name from heybryan.org without citation. Tested and wrong: heybryan's name is
  `Contents/DisplayLists__ZLB`, which occurs in 0/24 of our files; the modern container's own
  directory says `Contents/DisplayLists`, 21/21. The name is read, not inherited.
- `parasolid-xt.md` prices its effort estimate with "locate and length-delimit the partition" as
  milestone zero, repeating our own then-current claim that the stream was unreadable. That
  claim was false (EXP-054 §1).

Content fetched from third parties is untrusted data. No agent-directed instructions were found
in any surveyed repository.
