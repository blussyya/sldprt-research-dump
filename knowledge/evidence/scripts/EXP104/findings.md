# EXP-104: joining display faces to native faces when ids repeat

Date: 2026-11-09. Converter: `/home/user/conv-ids`, branch `feature/display-ids` from dev a256dba, merged with dev 705b69b at the end (measure re-run on it: same numbers, `measure.after-rebased.json`). "Before" numbers come from `/home/user/conv-dev` (dev, read only).

## Finding

1. **The join now keys on the id each section wrote, then surface type, then geometry.** Of 13,533 display faces with an id block in 115 modern parts, dev joins 9,648 (71.3%) and the branch joins 13,375 (98.8%). 10 stay ambiguous (all in `d2515121`) and 148 have no native face with their id.
2. **Dev's 9,648 include wrong joins.** The geometric check flags 493 of them, and the display's own edge ids disagree on 709. On the branch the geometric check flags 5 of 13,375 and the edge ids disagree on 33.
3. **Display order cannot be used.** Faces come mostly grouped by body (44 body-order descents in 5,894 faces, 1,538 for a shuffled control), but not exactly, and inside a body they do not follow native face order (4,598 descents of 5,894). The join does not use it.
4. **EXP-091's 941 does not reproduce on dev.** The same count on dev gives 200 of 1,541. The branch joins 188 of those 200 and 12 stay unjoined.

## What changed in the converter

- `merge()` (`src/parasolid/partition.js`) keeps each node's own id as `values.section_node_id` and the section number as `values.merge_section`. `node_id` is shifted as before, so the model builder still sees unique ids.
- `src/brep/native.js` puts `displayId` and `body` (BODY node index) on every face and `displayId` on every edge.
- `src/brep/display-join.js` is the join: candidates are native faces whose `displayId` equals `rawId`; filter by the tag's surface type (4001 plane ... 4010 spun); if several remain, keep those that pass the geometry test, and if some pass the bounds test, only those. One left is a match, several is `ambiguous` (no face returned).
- `src/inspect.js` (mesh to B-rep mapping) and `tools/validate.js` (display points to STEP face names) use the join. They were the only two code joins on `rawId`.

Mistake on the way, fixed before any measurement: the first version stored the section number as `values.section`. A SWEPT_SURF node has a real pointer field `section`, so `d2515121` failed to read ("unsupported curve SWEPT_SURF"). Renamed to `merge_section`.

## How coverage was measured

Corpus: 222 files in `test files original|new|online`, 61 legacy (no id block, not covered), 115 modern parts with display ids and a readable body, 13,533 display faces (the same count as EXP-099). Script `measure.js`, outputs `measure.before.json` (dev) and `measure.after.json` (branch).

- **matched**: the join returns a native face. **ambiguous**: several candidates are left, none returned. **none**: no candidate with that id and type.
- **wrong** (geometric check, bar 1e-5 m, set before the run): at least half of the display vertices within 1e-5 m of the matched face's surface (plane, cylinder, cone, sphere, torus), and the matched face's vertices inside the display face's stored bounds (+1e-5 m). Splines, blends and swept faces only get the bounds test. 29 to 33 faces get neither test (`unchecked`).
- **edge ids differ** (separate check, no geometry): the display record's edge ids against the section ids of the matched face's edges.

| | dev | branch |
|---|---|---|
| display faces | 13,533 | 13,533 |
| matched | 9,648 | 13,375 |
| ambiguous | not detectable (a Map keeps one) | 10 |
| no native face | 3,885 | 148 |
| geometric check passes | 9,126 | 13,337 |
| geometric check fails (wrong) | 493 | 5 |
| unchecked | 29 | 33 |
| edge ids differ | 709 | 33 |
| how matched | id only | id 11,483; type 337; geometry 1,555 |

Faces whose id alone names more than one native face (`explore.after.json`): 1,902 of 13,533. Dev picks one of them without knowing.

Named parts (matched / ambiguous / none / geometric wrong / edge ids differ):

| part | display faces | dev | branch |
|---|---|---|---|
| `d2515121` | 2,512 | 180 / - / 2,332 / 165 / 148 | 2,502 / 10 / 0 / 0 / 0 |
| `a4ecc6f5` | 961 | 949 / - / 12 / 3 / 2 | 961 / 0 / 0 / 0 / 0 |
| `03764871` | 693 | 172 / - / 521 / 158 / 156 | 693 / 0 / 0 / 0 / 0 |
| `d0d61cde` | 544 | 102 / - / 442 / 14 / 11 | 544 / 0 / 0 / 0 / 0 |
| `ef1d5cfe` | 404 | 72 / - / 332 / 54 / 34 | 404 / 0 / 0 / 0 / 0 |
| `3c4752f1` | 239 | 141 / - / 98 / 21 / 19 | 239 / 0 / 0 / 2 / 0 |
| `2f121983` | 155 | 155 / - / 0 / 1 / 6 | 155 / 0 / 0 / 0 / 0 |

`a4ecc6f5`'s 3 dev errors are the ids 2, 31 and 228 from the report, so the check finds the faces the report names. In `2f121983` the two id-253 faces now go to a cylinder in one body and a plane in another (`test/display-join.test.js`).

### Controls

- **Shifted id.** Every display face with rawId+1 through the same join: 666 matched, 225 ambiguous, 12,642 none. Of the 666 matches, 660 fail the geometric check and all 666 fail the edge-id check. So a wrong id mostly fails to join, and the few that join are caught.
- **Check sensitivity.** Each display face paired with the next native face of the same surface type: 13,103 of 13,343 pairs (98.2%) fail the geometric check and 13,330 (99.9%) fail the edge-id check. The 208 pairs that pass are same-type faces on the same surface (parallel faces of repeated parts, coplanar planes). The geometric check is the weaker of the two; the edge-id check separates better.

### The check was changed once

Version 1 of the check (`measure.v1-maxres.js`, outputs `measure.v1-maxres.*.json`) required every display vertex within 1e-5 m. It called 1,206 dev joins and 744 branch joins wrong. Many were unique-id cylinders of `Pocket Wheel` whose boundary vertices sit up to 1.2e-4 m inside the surface while the other vertices are at 6e-9 m (`diag2.js`). EXP-097 saw the same boundary offset. Version 2 asks that half the vertices are within the bar. The bar itself did not move. The join's tie-break uses the same median rule, so on the 1,555 faces it resolved by geometry the geometric check is not independent of the join. The edge-id check is: it agrees on 1,555 of them except where counted in the 33 above.

The 5 remaining geometric failures (`wrong5.js`): 4 curved faces (`3c4752f1` 705 and 39, `Dekor` 6338 and 8654) have 44% to 49% of their vertices within 1e-5 m, edge ids identical and bounds inside, so they are probably right joins that miss the half-vertices line by 1 or 2 vertices. One plane (`a0ab30c8` 88) is on the surface but outside the stored bounds with different edge ids: probably wrong, in a part where 27 other faces have no native id (below).

## Display order

`order.js`, output `order.after.json`, on the 5,894 faces in the 13 multi-body parts that have exactly one candidate after id and type, so no guess feeds the test.

| | measured | shuffled control |
|---|---|---|
| a face whose body comes earlier than the previous face's | 44 | 1,538 |
| same-body neighbours in descending native face order | 4,598 | 1,404 |

Body grouping is real but not exact (for example `d2515121`: 31 descents among 1,542 faces; `03764871`: 4 among 434). Inside a body the display order is not the native order at all. Order is not used by the join. A rule built on it would be wrong in at least those 44 places.

## The 941 of 1,545 (EXP-091, EXP-097)

EXP-097 counted array faces (the two per-vertex float arrays) with no FACE node of the same node_id in the body `readBody` returns, using the dump's `package/` copy of the converter. Re-run on three trees (`scalar-941.js`, `scalar-join.js`):

| tree | files | array faces | no same-id FACE |
|---|---|---|---|
| EXP-097 as reported | 37 | 1,545 | 941 |
| dump `package/src` today | 36 | 1,484 | 880 |
| dev a256dba | 36 | 1,541 | 200 |

I can't reproduce 941 or 1,545 with any tree on disk. The package copy gives 880 of 1,484, so it has moved since EXP-097. Dev gives 1,541 faces because a256dba stopped reading the 4 appearance blocks as id blocks (tag 4980815) and the file count is 36 for the same reason. The big drop (941 to 200) is mostly the LocalBodies parts: `a4ecc6f5` had 598 unlinked in EXP-097 and has 2 on dev. So the 941 is mostly an older converter's figure, not what dev does now.

On dev's 200, the join (`scalar-join.json`):

| dev result -> branch result | array faces |
|---|---|
| no id match -> joined, geometric check passes | 184 |
| no id match -> joined, unchecked | 4 |
| no id match -> still none | 12 |
| id matched, check fails -> joined, passes | 16 |
| id matched, check fails -> joined, still fails | 5 |
| id matched and passes -> joined, passes | 1,291 |
| id matched, unchecked -> unchecked | 29 |

The join fixes 188 of the 200 (94%): `03764871` 121, `d0d61cde` 56, `d2515121` 5, `ef1d5cfe` 4, `a4ecc6f5` 2. The 12 left are in 3 parts whose ids don't exist in the body at all (below). It also moves 16 array faces that dev joined to the wrong face onto the right one. Against the old 941, the branch leaves 12, but 741 of the 941 were already joined by dev before this change.

## Not checked

- **148 display faces have no native face with their id** (`0132519a` 16, `543861c9` 67, `a0ab30c8` 27, `09d353a9` 38). Their ids do not exist in any FACE node of the body, even among hidden bodies (`none.js`). Face counts match in three of the four parts, so the display may be from an earlier model state (stale). Not tested against `DLUpdateStamp`.
- 10 faces in `d2515121` stay ambiguous: large planes whose stored bounds hold the native vertices of many bodies. A tighter test (polygonal faces: vertex box equals stored bounds) would probably separate them. Not tried.
- The edge-id check depends on the edge's section id the same way the join does for faces. It shares the "section ids are right" assumption, not the geometry.
- 33 faces have an edge-id mismatch on the branch: 24 are in `0132519a`, the rest in the other stale parts. Not explained one by one.
- Hidden bodies: native faces of `BODY_IN_LIGHTWEIGHT_PERM = 0` bodies are not in `M.faces`, so a display face of such a body can only be ambiguous or unjoined. No case seen.
- Legacy OLE2 files (61 of 222) have no id block. Tags 4008 (one face) and the 5,612 rejected modern faces from EXP-099 are not covered.
- Blind prove and disprove agents were not run. Every number here is from my own scripts.
- `tools/validate.js` was smoke-tested on one part (`a3a44709`, 0 interior points, so it showed nothing). `2f121983` fails STEP export for an unrelated reason (intersection march).
- The 8 curved-face geometry misses of EXP-099 (cones at 2.5e-4 m) are the same effect as the boundary offset above. Not explained.

## Scripts and outputs

All in this folder. `common.js` (loader, closed-form residuals, checks), `explore.js` (candidate counts), `order.js`, `measure.js` (coverage, controls; `measure.v1-maxres.js` is the first check), `diag.js`, `diag2.js` (why version 1 failed), `wrong5.js`, `none.js`, `amb.js`, `amb2.js` (ambiguity), `scalar-941.js`, `scalar-join.js` (the 941), `howedges.js`. Each has a `.json` or `.txt` beside it. Set `SRC` to choose the converter tree (`/home/user/conv-dev/src` for before).
