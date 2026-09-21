# parasolid/v0.1 — Parasolid XT transmit reader

Reads the **header and schema table** of a Parasolid XT binary transmit, whether it came from
`Contents/Config-0-Partition` inside a SLDPRT or from a `model.x_b` exported by SolidWorks.

**It does not decode geometry.** No entity, surface, curve or coordinate is read. This is
NQ-037's first milestone deliberately kept narrow: establish the framing, enumerate what the
file declares, and stop at the first thing not yet understood rather than guessing past it.

## Use

```bash
node parasolid/v0.1/test/validate.js
```

Cross-checks all 24 SolidWorks 2022 controlled models: partition header, `.x_b` header, and the
schema table read from `.x_b` against the same table read from the ASCII `.x_t`. Exits nonzero
on disagreement.

## What is established

Header:

```
"PS"  u32be descLen  <desc>  u32be schemaLen  <schema>
```

Lengths are big-endian and self-checking: the partition's description is 63 bytes
(`: TRANSMIT FILE (partition) created by modeller version 3301247`) and the export's is 51, the
difference being exactly `"(partition) "`.

Schema entry: type letters, `u8` name length, name, `u16be` code, `u16be` flag.

Result across the corpus: 24/24 partition headers, 24/24 `.x_b` headers, 24/24 schema tables
agreeing with the text form, 168 entries compared, 0 disagreements. All models carry schema
`SCH_3301247_33103_13006`.

## What is not

- The 9-byte preamble before the first schema entry is kept raw.
- The reader stops after `index_map_offset` (7 entries) where the text form has 19. Later
  entries carry an extra trailing field the fixed code/flag pair does not describe. The stop
  reason is reported, not swallowed.
- The node stream is not located precisely and nothing in it is read.

See [EXP-056](../../knowledge/evidence/2026-09-21_parasolid-header-EXP056.md).

## Why the corpus makes this verifiable

Each model ships the same body three ways — embedded partition, exported `.x_b`, exported
`.x_t`. The text form states its schema table in ASCII, so a binary decode is checked against an
independently produced encoding rather than against our own expectations.
