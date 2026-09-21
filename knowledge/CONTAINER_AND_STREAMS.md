# Container and Stream Map

What the modern SLDPRT container holds, verified on our own corpus.

Reproduce with `scripts/container/`:

```bash
node knowledge/scripts/container/list-stream-names.js      # stream inventory
node knowledge/scripts/container/probe-partition.js        # Parasolid partition
node knowledge/scripts/container/verify-external-claims.js # file-type discriminator
```

Corpus unless stated otherwise: 24 files — 21 modern, 3 legacy OLE2 — under
`test files original`. Counts marked *(45-file)* come from the wider sweep in EXP-057, which
adds the 24 SolidWorks 2022 controlled models.

---

## 1. File type discriminator

| test | modern | legacy OLE2 |
|---|---|---|
| bytes 4–7 = `00 00 00 04` | **21 / 21** | 0 / 3 |
| contains `34 f6 e6 47 56 e6 47 37 f2` | **21 / 21** | 0 / 3 |

Bytes 0–3 are **distinct in all 21** modern files, so the discriminator sits at offset 4, not 0.
First occurrence of the 9-byte sequence varies (offsets 39–614), making it a membership test
rather than a fixed-offset signature.

Legacy files are identified by the standard OLE2 signature `D0 CF 11 E0 A1 B1 1A E1`.

## 2. Stream inventory

Decompressing the modern container yields 37–48 named streams per file. Present in all 21:

```
Contents/3DExperienceExchange2      Contents/CMgr             Contents/CMgrHdr2
Contents/CnfgObjs                   Contents/Config-0         Contents/Config-0-LWDATA
Contents/Config-0-ModelHeader       Contents/Config-0-Partition
Contents/Config-0-ResolvedFeatures  Contents/CusProps         Contents/Definition
Contents/DisplayLists               Contents/OleItems         Contents/eModelLic
Header2                             ModelStamps               Preview
PreviewPNG                          SwDocContentMgr/SwDocContentMgrInfo
ThirdPtyStore/VisualStates          [Content_Types].xml       _rels/.rels
docProps/…  swXmlContents/Features  swXmlContents/KeyWords
```

Notable partial-presence streams: `Contents/Config-0-GhostPartition` (18/21),
`Contents/PMISemanticDataDB` (17/21), `Config-0-FeatureBodies/LocalBodies` (**1/21**).

**`Contents/DisplayLists` is the name the files themselves use** — present verbatim in 21/21
modern container directories. No `__ZLB` or `__Zip` suffix occurs anywhere in the corpus, in raw
bytes or decompressed. The suffixed form in the historical literature is legacy-era.

## 3. Per-stream CRC-32 *(45-file)*

The `u32` at stream-header + 14 is a **CRC-32 of the inflated stream bytes**.

| | count |
|---|---|
| named streams verified | **1730** |
| mismatches | **0** |
| not decompressible | **0** |

Caution for any implementation: sweeping the 6-byte header signature across a whole file
produces false positives. In this corpus 1,465 spurious hits failed to inflate and 10
mismatched — **all** with non-printable names, none with a printable one. Without separating
those, the result reads as CRC failures that are really artifacts of the scan.

`parser/v0.1` currently reads this field only as a heuristic filter (`>= 65536`) and does not
verify it. See NQ-040.

## 4. DisplayLists format version

The container declares a version in a dedicated stream:

| tag | files *(21-file)* | files *(45-file)* |
|---|---|---|
| `_DL_VERSION_13000` | 2 | 2 |
| `_DL_VERSION_14000` | 1 | 1 |
| `_DL_VERSION_15000` | 15 | 39 |
| `_DL_VERSION_16000` | 1 | 1 |
| `_DL_VERSION_17000` | 2 | 2 |

**One per-face record grammar parses all five with 0 rejections** across 1,414 faces (EXP-057).
The declared version does not select a record layout across this range. The parser should still
surface the tag and warn outside 13000–17000, since the evidence bounds the range tested rather
than establishing that no version ever differs.

## 5. `Contents/Config-0-Partition` is the native B-rep

Present in **21/21** modern files, 608 B to 696 KB, scaling with model complexity.

It was recorded here for a long time as unreadable high-entropy data. The entropy measurement
was right (H = 7.93–8.00 bits/byte raw); the conclusion drawn from it was wrong. The stream
carries a 28-byte header, after which it is **ordinary zlib**. Inflating drops entropy to
H = 4.26–6.68 and exposes:

```
PS...?: TRANSMIT FILE (partition) created by modeller version 3301247
SCH_3301247_33103_13006
```

A Parasolid XT transmit file — the native B-rep.

| check | result |
|---|---|
| inner zlib member inflated | **21 / 21** |
| `TRANSMIT` banner present | **21 / 21** |
| constant section magic at offset 4 | **21 / 21** |

Section magic, 16 constant bytes *(45-file)*:

```
23 1d d5 71 da 81 48 a2 a8 58 98 b2 1b 89 ef 99
```

Schema identifiers, five modeller variants over one base:

| schema | files |
|---|---|
| `SCH_3301247_33103_13006` | 15 |
| `SCH_3501251_35102_13006` | 2 |
| `SCH_3101290_31100_13006` | 2 |
| `SCH_3401247_34101_13006` | 1 |
| `SCH_3201230_32001_13006` | 1 |

All terminate in `13006`, so it is one base schema to solve rather than five.

**Readable is not decoded.** The header and schema table are read (EXP-056,
`parasolid/v0.1`); no node, entity, surface or coordinate has been.

## 6. Lesson worth keeping

High entropy meant "compressed", not "opaque", and we read it as opaque for months. The cost of
the mistake was not the measurement — it was treating a measurement as a conclusion and never
trying the cheap next step. Before recording anything as unreadable, try inflating it.
