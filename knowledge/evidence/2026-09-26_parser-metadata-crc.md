# Parser follow-up — empty edge table and modern stream CRC

Date: 2026-09-26. Base: `staging` at `39095a36fbb65096e655d3a58651a1fc154b9eb2`.

NQ-039: On `C23_cube_sw2011_to_2022`, the metadata edge table is empty while Block1 has nonzero IDs. The former gate discarded the whole metadata object on all six faces. Both `parser/v0.2` and `parser/v0.3` now retain the metadata, including tag 4001, and emit an explicit unverified-correspondence warning. A *populated* table with a deliberately corrupted ID still fails and leaves geometry available but metadata null. Reproduce with `node parser/v0.3/test/metadata-empty.js`.

NQ-040: The modern container reader now compares the stored header CRC-32 with the inflated bytes for plausibly named, successfully inflated streams. The six-byte signature also matches non-stream data; its non-printable decoded names are not treated as real CRC failures. A mutation of the actual `Contents/DisplayLists` data-stream CRC is rejected, while the original is accepted. Reproduce with `node parser/v0.3/test/container-crc.js`. This is not a general hostile-file audit; notably, the existing reader's `CRC >= 65536` candidate gate and stream-discovery heuristics have not been redesigned.

Regression: `parser/v0.1/test/run-corpus-tests.js`, `parser/v0.2/test/validate.js`, `parser/v0.3/test/validate.js`, and the v0.3 worker test pass. v0.3 covers 73 inputs, with 145 legacy and 1,414 modern accepted faces. This validates the bounded changes against the held corpus, not every possible file.
