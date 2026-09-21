# EXP-056 — Parasolid XT transmit header and schema table

> **Corrected 2026-09-21 by EXP-058 and EXP-059.** Two claims below are wrong and one headline
> number is misleading. (a) "the text form continues to 19" — those 19 matches are not one table;
> gaps of 148, 203 and 4,572 characters separate the tail entries, the last sitting 5.4 KB into
> node data. The contiguous prefix is **13**. (b) the schema-entry grammar's fourth field was
> called `flag`; it is **undecoded**, and the reader no longer names it. (c) "24/24 agreeing,
> 168 entries" is **n = 1** — bytes 0–349 are byte-identical across all 24 models. See
> [EXP-059](2026-09-21_v0.4.9-EXP059.md).

Date: 2026-09-21
Scope: NQ-037 milestone 1 — read the header, enumerate what the file declares, locate the node
stream. **No entity fields are resolved and no geometry is produced.** Nothing here is a B-rep
claim.

Code: `parasolid/v0.1/src/xt-reader.js`. Test: `parasolid/v0.1/test/validate.js`.

---

## 1. Why this is checkable rather than guessed

Every model in `test files new/SW2022` ships three views of the same body:

| file | form |
|---|---|
| `model.SLDPRT` → `Contents/Config-0-Partition` | the embedded binary we want to read |
| `model.x_b` | SolidWorks' own binary transmit of that body |
| `model.x_t` | the same transmit in **ASCII text** |

The text form states its schema table in readable characters. So a binary decode can be checked
against an independently produced text encoding of the same table, rather than against our own
expectations. That is the entire basis of this experiment.

## 2. Header layout (verified)

```
"PS"                     2 bytes
u32be descLen
descLen bytes ASCII      ": TRANSMIT FILE [(partition) ]created by modeller version <v>"
u32be schemaLen
schemaLen bytes ASCII    "SCH_<modeller>_<variant>_<base>"
```

Both length fields are **u32 big-endian**. The description length is self-checking:

| source | descLen | description |
|---|---|---|
| partition | 63 | `: TRANSMIT FILE (partition) created by modeller version 3301247` |
| `model.x_b` | 51 | `: TRANSMIT FILE created by modeller version 3301247` |

Both strings are exactly their stated length, and differ by precisely the 12 characters of
`"(partition) "`.

**The embedded partition is an ordinary Parasolid transmit with the ASCII banner stripped.**
The `.x_b` carries the conventional `**ABCDEFGHIJ… **PARASOLID … **END_OF_HEADER` banner and then
begins with the identical `PS` structure; the partition begins with `PS` directly. Past their
respective banners the two are the same kind of object, which is what makes `.x_b` usable as a
reference for the partition.

## 3. Schema entry grammar (verified)

```
type letters      one or more uppercase ASCII (A, C, D, I, Z, …)
u8 nameLen
nameLen bytes     lowercase identifier
u16be code
2 bytes           UNDECODED — always 00 01; see EXP-059 §3
```

The text form writes the same entry as `<letters><nameLen> <name><code> <flag>`, e.g.
`CCCI7 lattice222 0` against binary `49 07 "lattice" 00de 0000`, with `0xde` = 222.

## 4. Result

`node parasolid/v0.1/test/validate.js`

```
models                                 24
partition headers parsed               24/24
x_b headers parsed                     24/24
schema tables agreeing with x_t text   24/24
schema entries compared                168
distinct schemas seen                  SCH_3301247_33103_13006
binary schema-table terminator:   24 × "no type letters at 228"
```

Every entry compared agreed on both name and code, in order. The `x_b` schema table for these
models reads:

```
lattice/222  mesh/1006  polyline/1008  owner/1040
boundary_mesh/1006  boundary_polyline/1008  index_map_offset/0
```

The partition declares a different set — `mesh/1006 polyline/1008 lattice/222 attdef_list/74
index_map_offset/0` — which is expected, since it is a different payload, not a copy of the
export.

## 5. What is not yet decoded

- **The 9-byte preamble** between the schema string and the first entry
  (`00 e6 00 00 00 00 00 65 13` in partitions, `… 00 0c 23` in `.x_b`) is retained raw. Its last
  two bytes differ between the two forms and are not interpreted.
- **The binary reader stops at `index_map_offset`**, after 7 entries, where the text form
  continues to 19. The text shows why: entries after that point carry an extra trailing field
  (`index_map_offset0 0 1 d` before `A9 index_map82 0`), so the fixed `code`/`flag` pair does not
  describe them. This is a **known, located gap**, not a silent truncation — the reader reports
  its terminator rather than guessing past it.
- **No node stream decode.** Where the node data begins is bounded but not established, and no
  entity, surface or coordinate has been read.

## 6. Bug found and fixed during the work

The first text-form parser used `[a-z0-9_]*` for the entry name. Because names may legally
contain digits, the class greedily absorbed the code's digits, the declared-length check then
rejected the entry, and the parser silently returned only the handful of entries whose codes
happened not to be swallowed — 5 instead of 19, with the important ones missing. It was the
declared length, not a character class, that had to drive the slice.

Worth recording because the failure was silent and looked like a successful parse. Had it not
been cross-checked against the binary read, a table missing its geometry-bearing entries would
have looked like a complete answer.
