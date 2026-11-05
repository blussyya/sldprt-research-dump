# Blind check of the feature export

This check did not import the EXP-088 feature exporter or survey. `check.js` uses the older EXP-079
archive loader directly, reads the raw `Config-0-ResolvedFeatures` stream, and separately parses
the `KeyWords` XML. It checks C00, C04, C07, C16, C23 and C24 from the SW2022 controlled set.

## C07 child and History records

C07's binary node for Boss-Extrude1 (32) contains one recorded child reference. Archive index 189
resolves uniquely to Sketch1 (26). The node occupies bytes 8,933 through 9,114. Cut-Extrude2 (46)
likewise points to archive index 286, Sketch2 (33), from its node at bytes 13,605 through 13,784.

The independent XML names all four features with the same IDs. Its `DissectableChildren` value on
Cut-Extrude2 is 33, matching the binary child. The XML does not carry a corresponding child
attribute on Boss-Extrude1, so it corroborates the Boss and Sketch identities but not that child
relation.

The History folder contains four `moHistoryFeatItemData_c` records. Their component feature IDs,
in stream order, are 26, 32, 33 and 46. Each resolves to exactly one of Sketch1, Boss-Extrude1,
Sketch2 and Cut-Extrude2. The records occupy bytes 606 through 1,112.

None of those fields is inside the reader's opaque dimension-placement scan. C07's one scan is at
bytes 10,760 through 11,347. Boss-Extrude1's child node is before it; Cut-Extrude2's child node is
after it; the History records are near the start of the stream. The claims still depend on the
EXP-079 MFC object and class readers, but not on searching inside the opaque span.

Across the six checked files, 126 binary feature ID/name pairs agree with `KeyWords`, with no
mismatch. The two XML child attributes in this sample, on C04 and C07, also agree with the binary
child lists.

## C23 count mismatch

The raw C23 feature stream is 11,481 bytes. Its u16 at offset 4 says 19 top-level slots. Starting
from the stream's stored archive index, the existing reader consumes 18 top-level objects and then
lands exactly at byte 11,481. There is no nineteenth null tag and no trailing padding.

By comparison, the other five checked streams consume their advertised count. C07 reads 21 slots,
including its final null slot, then leaves its usual two zero bytes. The C23 mismatch is therefore
real under the observed top-level grammar; this check does not assign a reason or invent a missing
object.

C23 also has one opaque dimension-placement scan, bytes 10,305 through 10,892. It lies inside the
last parsed feature. A false match inside that span could damage the final object's boundary, so
this check cannot make the stronger claim that every byte before EOF has a decoded field. It can
say that the current reader reaches EOF after 18 top-level objects while the raw count is 19.

Run from the dump root:

```sh
node knowledge/evidence/scripts/EXP088/features-blind/check.js
```
