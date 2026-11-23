# Feature and history export (draft for review)

The existing binary reader can already recover useful tree structure. This experiment makes that
structure inspectable without treating every object reference as a modelling dependency.

`export.js` reads the binary feature stream through EXP-079's reader. It exports feature names,
IDs, archive indices, byte ranges, child links, contextual feature references, and History folder
items. XML is not used to build the export. `C07.json` is an example.

In C07, Boss-Extrude1 (32) has Sketch1 (26) as its recorded child, and Cut-Extrude2 (46) has
Sketch2 (33). The History folder records those four features in that order. A contextual reference
also retains its source class and field path: a sketch-plane reference is not flattened into the
same relation as a feature's child list. Self references remain visible. The exporter does not
claim to reconstruct the full rebuild dependency graph or a log of every edit.

## Checks and gaps

The survey covers 49 controlled models and nine top-level original parts. It does not cover the
online corpus or nested original-model directories.

- 50 of 58 files consume all their advertised top-level slots and end with either no bytes or two
  zero bytes left: 48 controlled models, cube and Helical Bevel Gear.
- C23, the 2011 model re-saved in 2022, advertises 19 slots but the reader gets 18 before exact EOF
  (11,481 bytes). The older loader called this complete because it checked EOF alone. This probe
  reports the discrepancy. It does not invent a nineteenth slot or claim to know what the count
  means in this case.
- The other seven files stop on an unsupported class/layout or have no ResolvedFeatures stream.
  Exact stop messages are in `survey.json`.
- These 50 files contain 124 recorded child links, all resolved by archive index, and 81 History
  items, all resolved to one feature ID. The 22-byte raw prefix of every History item is identical
  here. Its meaning is still unknown; it is preserved rather than assigned speculative fields.
- Three contextual references in the gear use feature ID 0xffffffff. Three inline hidden features
  have that ID, so an ID-only join is ambiguous. The exporter reports all candidates; it does not
  choose one. Context is needed to decode those references.
- The existing parser scans forward in 99 stretches totalling 51,151 bytes across those 50 files.
  The export records the range and target class for every scan. Reaching EOF does not mean these
  bytes have been decoded. Other fixed raw fields are also retained by the underlying reader.

`check-keywords.js` checks the independently stored KeyWords XML against the binary export. XML
is available in 25 of the 50 files. All 536 named binary features checked have the same ID and name
in XML. Nine XML DissectableChildren entries agree with the binary child list. The other 25 files
have no KeyWords stream. XML agreement checks names and those nine links; it does not validate all
binary fields or prove a complete feature graph.

## Run

From the research dump:

```sh
node knowledge/evidence/scripts/EXP088/features/export.js "test files new/SW2022/C07_cube_two_holes/model.SLDPRT"
node knowledge/evidence/scripts/EXP088/features/survey.js
node knowledge/evidence/scripts/EXP088/features/check-keywords.js
```

The next useful decoding targets are the seven reader stops, the dimension-placement stretches,
and the context that identifies inline features. A fresh independent check is still required
before promoting these findings to verified format documentation.
