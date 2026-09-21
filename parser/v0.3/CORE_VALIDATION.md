# v0.3 core validation — 2026-09-21

Based on staging f216801 and EXP-064's legacy DisplayLists discovery. This implementation reads modern DisplayLists and the supplied SW2011 OLE2 DisplayLists geometry. It is a tessellation parser, not a Parasolid B-rep decoder.

Run `node parser/v0.3/test/validate.js` from the repo root. Raw per-file results, hashes and explicit unsupported files are in `test/RESULTS.json`.

- 25 SW2011 inputs: 145 faces, native build-log face counts match in every model; no rejected records. Stored boxes decoded on every face. Legacy downstream metadata remains raw, without applying the incompatible modern grammar.
- 45 modern inputs: 1,414 faces. Positions, normals, triangle indices, edge annotations and interpreted metadata agree with v0.2.
- All 73 inputs compared using Node zlib and the browser decoder: identical parser results. The three oldest original OLE inputs remain unsupported: SW2000-s01 and chainwheel lack a named DisplayLists stream; plate4 has an unsupported array layout. The parser reports these failures explicitly.
- Corruption controls reject a short OLE header, truncated sectors, invalid sector shift, cyclic directory chain, corrupt zlib Adler checksum and truncated zlib input.

The fresh CFB reader validates sector ranges, chain cycles, stream lengths, FAT/DIFAT bounds and mini-stream access. It supports CFB v3/v4 headers but only v3 is covered by this corpus. It rejects ambiguous multiple DisplayLists streams. SW2011 compressed wrapper: 16-byte signature, u32 little-endian inflated length at 16, compressed length at 20, zlib member at 24, then eight zero bytes. Unexpected wrappers are rejected; no offset guessing or partial inflation fallback is used.

Limits: 128 MiB input/decompressed stream, 2 million accepted vertices, 50,000 accepted faces. Node callers should inject bounded decompressors, as the CLI does. Geometry checks retain the inherited strip/control rules. Count agreement and decoder parity alone do not prove exact geometry, topology or hostile-input safety. External STL comparison and browser interaction checks are separate follow-up gates. Multi-configuration geometry is not separated into independently selectable configurations.

The custom browser inflater is a derivative of `viewer/inflate.js`, adding an output cap and Adler-32 verification. Original parser and viewer versions remain unchanged.
