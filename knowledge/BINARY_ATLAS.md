# Binary atlas — structural coverage and semantic frontier

Checkpoint: 2026-09-29 UTC. This is the navigation layer for byte maps, field readers and unanswered regions. A byte being assigned to a typed field does **not** mean its enum, ownership role or application behavior is fully understood. Raw values and original bytes remain authoritative.

## Layers and offset coordinates

| Layer | Current evidence | Remaining boundary |
|---|---|---|
| SLDPRT physical container | Modern stream extraction; bounded OLE/FAT/mini-FAT reader | Complete modern directory/stream allocation grammar and old wrapper variants |
| Saved display geometry | `parser/v0.3`, verified strip/metadata layouts | Older Zip streams, multi-chunk wrappers outside controlled samples, unknown auxiliary semantics |
| Partition stream wrapper | Section frame `u32 size, GUID, u32 inflated, u32 compressed, zlib, 8 zero bytes` (EXP-074): Partition = partition + deltas (70/70), GhostPartition = partition (65/65); same frame in LocalBodies and ResolvedFeatures | Deltas and GhostPartition semantics; ResolvedFeatures 1-face bodies; LocalBodies 64-byte prefix; tail-byte role |
| Inflated Parasolid transmit | Typed header, embedded edits/new schemas, records and terminator | Unseen base schemas, bare binary, userfields and unsupported node types |
| Solid topology | Typed references and reciprocal graph checks | General non-manifold support and configuration/body authority |
| Analytic/NURBS geometry | Parameters, control arrays, knots and trimming references | Full independent evaluation of curved/trimmed solids and export semantics |
| Feature tree/application streams | Earlier evidence indexed in `NEXT_QUESTIONS.md` | Complete sketches, dependencies, feature semantics and edit history |

X_B maps use **absolute file offsets**. Native maps use offsets **inside an inflated payload**. Modern decompression and OLE sector chains are transformations; an inner offset cannot be treated as a physical SLDPRT offset. Every interval is half-open `[start,end)`.

## Executable maps

[EXP-071](evidence/2026-09-29_v0.4.9-EXP071.md) supplies full labelled C00 X_B maps for both eras. [EXP-072](evidence/2026-09-29_v0.4.9-EXP072.md) supplies the native modern C00 map. Each contains typed values, offsets, raw hex, schema edits, node indices, and references. [EXP-073](evidence/2026-09-29_v0.4.9-EXP073.md) supplies coverage and per-type summaries for the original files.

Regenerate from repository root:

```sh
node knowledge/evidence/scripts/EXP071/audit.js --write
node knowledge/evidence/scripts/EXP072/native-partitions.js --write
node knowledge/evidence/scripts/EXP073/original-partitions.js --write
node knowledge/evidence/scripts/EXP074/display-native-join.js --write
```

Map files end in `.json.gz`. To inspect one without a separate gzip utility:

```sh
node -e 'const fs=require("fs"),z=require("zlib");console.log(z.gunzipSync(fs.readFileSync(process.argv[1])).toString())' knowledge/evidence/scripts/EXP071/C00_SW2022_XB_MAP.json.gz
```

## Primitive encodings

The neutral-binary reader handles big-endian signed 16/32-bit integers, byte-valued enums, single-byte characters and logicals, IEEE binary64 doubles, and composite vector/interval/box values. Integral/floating null sentinels are preserved as `null` values with their raw bytes retained in maps. Unicode records currently retain transmitted short values; general character interpretation is not established.

Pointer indices use a signed 16-bit first word `r`. A positive word decodes to `r-1`; a negative word is followed by a positive quotient `q` and decodes to `q*32767-r-1`. The sign bit thus selects the long form. Null pointer index zero is encoded as word `0001`, not `0000`. A legitimate negative pointer word can equal a scalar null sentinel; the reader handles pointer words separately. Synthetic tests exercise the long form; corpus observations remain separately identified.

Binary header layout is `PS 00 00`, a 16-bit description length and its bytes, a 32-bit schema-name length and its bytes, a 16-bit maximum node-type count, and a 32-bit userfield size. Earlier readers' apparent 32-bit description length overlapped the two fixed zero bytes; it happened to give the same length on held files. The new field map records the actual split.

Text numeric tokens require their documented delimiter; characters and logicals can abut subsequent fields. CR/LF layout is removed, strings are length-driven, escapes are decoded, and `?` is retained as null. Whitespace-padded text, alternate schema bases and nonzero userfields remain outside demonstrated support.

Schema edits consume base fields in order using Copy/Delete/Insert/Append. The declared effective field count is checked, the edit terminator is consumed in place, and unknown layouts stop explicitly. New node definitions carry their own name, description and typed field descriptors. The reader does not scan forward to a convenient marker after a parse failure.

## Example: modern C00 BODY

Input hash and all ranges are in EXP-071's SW2022 map. Selected ranges illustrate the coordinate system; the map contains **every** BODY field, not only these examples.

| Absolute X_B range | Field | Value / representation |
|---|---|---|
| 964–968 | highest_node_id | 232, signed 32-bit |
| 968–970 | attributes_groups | index 2 |
| 970–972 | attribute_chains | index 3 |
| 972–986 | lattice through key | seven pointer slots, all zero |
| 986–994 | res_size | `408f400000000001`, one ULP above 1000 |
| 994–1002 | res_linear | `3e45798ee2308c3a`, 1e-8 |
| 1006–1008 | previous | zero |
| 1008–1009 | state | byte 1 |
| 1011–1012 | body_type | byte 1 |
| 1012–1013 | nom_geom_state | byte 1 |
| 1013–1015 | shell | index 5 |
| 1025–1027 | region | index 9 |
| 1027–1029 | edge | index 10 |
| 1029–1031 | vertex | index 11 |
| 1031–1035 | index_map_offset | integer zero |
| 1043–1047 | lowest_node_id | integer zero |
| 1047–1049 | mesh_offset_data | pointer zero |

Unresolved serialization indices are listed explicitly. The published format permits absent targets to be interpreted as null; raw pointer values are never silently replaced in the evidence. Valid topology links required by the audit resolve independently.

## What remains unexplained

- Native/export loft curves and `nom_geom_state` differ; equal face counts do not settle equivalence.
- Loft export ID ceilings exceed the surviving decoded maximum by 16. Allocation history is a possible explanation, not a finding.
- The original PTC part has an empty primary partition but a nonempty saved display mesh. Authoritative body selection needs other streams.
- Partition-stream bytes after the first zlib member are retained as raw hex, including further members. Their semantic relationship is not assigned.
- The ASCII banner, container allocation/padding, feature/application streams and old wrappers are not exhaustively mapped by the new transmit reader.
- Enum/flag meanings beyond established values, unobserved bit masks, mathematical spline evaluation and converter correctness remain open.

No claim is made that the entire SLDPRT format or every bit has been understood. The atlas makes the decoded region and the remaining raw region explicit so further work can be measured rather than guessed.
