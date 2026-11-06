# Decoding

How to work out what bytes in an SLDPRT mean, and how to avoid fooling yourself while doing it.

## Where things live

An SLDPRT is a container of named streams. The ones that matter most:

- `Config-N-Partition`: the Parasolid B-rep. It has a "(partition)" section with the body, then a
  "(deltas)" section. The deltas format isn't decoded yet.
- `Config-N-ResolvedFeatures`: another copy of body data.
- Display lists: the tessellated mesh SolidWorks draws. Older files keep it in an OLE2 stream
  `DisplayLists__ZLB`; newer ones use the modern layout. The STL comes from here.
- `ModelStamps` (12 bytes): u32 time, u32 model change counter, u32.
- `DLUpdateStamp` (6 bytes; `_DL_VERSION_19000/DLUpdateStamp` in modern files): the change
  counter at the display list's last update. Lower than ModelStamps' counter means the mesh may be
  stale. In a 142-file survey, 109 matched, 24 differed and 9 had no stamps.
- `History`, `Biography`: save history as readable strings.

Section frame: u32 size, the GUID `231dd571-da81-48a2-a858-98b21b89ef99`, then zlib chunks.
Parasolid binary doubles are big-endian. Use `Buffer.from(P.GUID)` from the reader instead of
typing the byte pattern by hand; a hand-typed pattern was wrong once.

Reader entry points (inspector worktree, `src/parasolid/partition.js`): `streams(buf)` gives every
stream by name, plus `sections`, `extractPrimary`, `survey`, `legacyBody`, `readBody`.
`src/parasolid/xt.js` has `parse`, `Reader`, `bases`, `names`. The converter has
`S.readBrep(file).parsed`, and `N.build(...)` gives faces, edges and vertices as Maps.

## Method

1. **Start from something known.** Find a value you can predict (a plane's distance, a face count
   from SolidWorks, a vertex from the STEP) and locate it in the bytes. Decode outward from
   there.
2. **Compare two saves of the same part.** The SW2026 re-save next to the 2013 original showed
   exactly what changed (the mesh, the stamp) and what didn't (the B-rep).
3. **Every byte has an owner.** When a field doesn't fit, don't call it padding. Write it down as
   unexplained and keep it in view. One 1 mm miss turned out to be the rule for how B-splines
   extend past their edge.
4. **Know your reader's limits.** When decoding fails, the gap is usually in our reader, not the
   file. Current gaps: legacy face metadata (`legacyTail`, "Legacy metadata grammar is not
   decoded") and the modern metadata ("Unexpected array header"). So neither gives face ids yet.
   Don't conclude "the file has no face ids" from that.

## Raw scans need a control

A raw scan is searching decompressed bytes for doubles, strings or patterns. Before you trust
"not found":

- Run the same scan on a section where the answer is known to be yes. The deltas scan for old
  plane offsets only counted after it found the known planes in the body section.
- Search both endiannesses, and both metres and mm, unless you know which applies.
- Allow for float noise: search for values within a tolerance, not exact bit patterns, unless the
  value is stored exactly.
- Record how many hits the control got and how many the real scan got, in the evidence file.

## Units and ordering traps

- `parse` JSON is in metres. STL is in mm. Scale before comparing (a 1000× mistake looks like a
  wildly wrong mesh).
- Face order in the mesh and the B-rep may differ. Match by geometry (centroid, normal, area)
  and check the match, don't assume index i is face i. A count match is not an identity match.
- Parasolid tags aren't SolidWorks face ids.

## When to stop and say "not decoded"

If a structure resists after the cheap tries, write down what you tried, what you saw, and what's
still unknown, and move on. An honest "not decoded" is worth more than a confident wrong guess.
