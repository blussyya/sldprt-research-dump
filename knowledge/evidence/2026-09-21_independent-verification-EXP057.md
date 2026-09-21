# EXP-057 — Independent verification of open format questions

Date: 2026-09-21
Corpus: 48 SLDPRT files — 45 modern (21 under `test files original`, 24 under
`test files new/SW2022`), 3 legacy OLE2 counted and skipped.
Script: `scripts/EXP057/verify-open-claims.js`.

Every question below is settled against our own files. None of the conclusions rests on an
external assertion; where a question originally arrived from outside, it is treated here as a
hypothesis to test, not a result to adopt.

---

## Q1 — The container carries a verifiable CRC-32 per stream. **Confirmed.**

Our container reader already reads the `u32` at stream-header + 14, but only as a heuristic
filter (`>= 65536`). It is a CRC-32 of the **inflated** stream bytes.

| | count |
|---|---|
| named streams, CRC verified | **1730** |
| named streams, CRC mismatch | **0** |
| named streams, not decompressible | **0** |

A 6-byte signature scanned across a whole file produces false positives — byte runs that pass
the shape checks but are not stream headers. Those are separated out by name plausibility:
1,465 spurious hits failed to decompress and 10 mismatched, all with non-printable names, and
**none** with a printable one. Without that split the raw numbers read as "10 CRC failures",
which is an artifact of the scan rather than a property of the format.

**Consequence.** Container extraction, which the README has flagged as unvalidated since it was
inherited unchanged into `parser/v0.1`, now has an integrity check available. A stream that
inflates but fails its CRC is corrupt or misframed and should be reported, not parsed.

## Q2 — Block1 is `u32` tokens, not `f32`. **The float reading is untestable, not merely wrong.**

INV-021 holds Block1 is per-edge `u32` ID tokens. A competing reading treats the array as
"finite f32 values". We had preferred ours on the strength of a shuffle control; this tests the
alternative directly.

| measure | result |
|---|---|
| Block1 words examined | 162,018 |
| finite when reinterpreted as f32 | **162,018 — 100.00%** |
| magnitude < 1e-30 when read as f32 | **162,018 — 100.00%** |
| largest value as u32 | 22,163 |

A finiteness test accepts **every word in the corpus**, so it separates nothing and cannot
distinguish the two readings in either direction. Worse for the float reading: every word is
effectively zero as a float, because a small integer's bit pattern lands in the subnormal range.
An array of 162,018 floats that are all ~0 is not a plausible value array.

Read as `u32` the same words are small, bounded integers (max 22,163) that partition exactly
into interior/boundary edges with 0 exceptions, and whose ordering is load-bearing — shuffling
edge order while holding tokens fixed produces 44,640 exceptions.

**Conclusion: Block1 is `u32`.** Recorded not as a preference between readings but as a
measurement that the float reading fails to survive.

## Q3 — No extended tessellation-table header form occurs. **Negative result, bounded.**

Hypothesis: a per-face tessellation header may carry a nonzero token in the slot we always
observe as 1.

| control token | strips |
|---|---|
| `1` | **11,515** |
| anything else | **0** |

Across 11,515 strips in 45 files there is exactly one form. This does not prove the extended
form does not exist — it bounds the claim: it does not occur in 45 files spanning five declared
format versions and both a curated and a purpose-built corpus. Our parser's
`Unsupported strip control` error is therefore reachable only by a file unlike anything we hold.

## Q4 — No face record carries zero normals. **Negative result, bounded.**

| measure | result |
|---|---|
| faces parsed | 1,414 |
| faces with zero normals | **0** |
| normals/positions count mismatch | **0** |

Every face in the corpus carries exactly one normal per vertex. As in Q3 this bounds rather than
refutes: the corpus is 45 files. NQ-035 stays open on that basis, but the parser's strict check
costs us nothing on anything we have seen.

## Q5 — One record grammar parses every declared format version. **Confirmed.**

| declared version | files | faces | rejected |
|---|---|---|---|
| `_DL_VERSION_13000` | 2 | 107 | 0 |
| `_DL_VERSION_14000` | 1 | 375 | 0 |
| `_DL_VERSION_15000` | 39 | 355 | 0 |
| `_DL_VERSION_16000` | 1 | 400 | 0 |
| `_DL_VERSION_17000` | 2 | 177 | 0 |

1,414 faces, 0 rejections, five declared versions, a single grammar. The per-face record layout
does **not** vary with the declared version across this range, so the tag is advisory for our
purposes rather than a layout selector.

This closes the substance of NQ-034. The parser should still surface the tag and warn on a value
outside 13000–17000, since the evidence bounds the range tested rather than establishing that no
version ever differs.

## Q6 — The partition section magic is 16 bytes. **Confirmed and extended.**

Across 45 partitions, 41 distinct byte sequences in the window sampled, sharing a constant
16-byte prefix at offset 4:

```
23 1d d5 71 da 81 48 a2 a8 58 98 b2 1b 89 ef 99
```

Earlier work here recorded only the first 12 bytes as constant. The full constant run is 16.

---

## Status changes

| item | before | after |
|---|---|---|
| NQ-034 | open | **resolved** — one grammar across 13000–17000 |
| NQ-036 | open | **resolved as a bounded negative** — 0 of 11,515 strips |
| NQ-035 | open | stays open, but bounded: 0 of 1,414 faces |
| INV-021 | held by preference over a competing reading | **held by measurement** — the competing reading accepts 100% of words and so tests nothing |
| container CRC | unvalidated | **verifiable**, 1730/1730 |

## Note on attribution

Q1–Q4 and Q6 began as questions raised by surveying other work. They are recorded here as our
own results because every one was decided on our own corpus with our own code, and several came
out differently from the claim that prompted them. Where a question arrived from outside, that is
stated as the origin of the *question*, not as support for the *answer* — the evidence above is
what carries each conclusion.
