# EXP-099: shared display face ids and odd surface tags

Date: 2026-11-09. Converter: /home/user/conv-dev (branch dev, read only; one throwaway copy in the scratchpad for the patch test).

## Finding

1. **Shared ids are real faces in different bodies, not a misread and not a split face.** Each body in a part numbers its own faces from 1, and the display stores that number. 552 of 552 shared-id groups in 9 parts put their members in different bodies (0 in the same body). The two named parts:
   - `2f121983`: one pair, rawId 253. Display face 3 (tag 4002, 161 vertices) is a cylinder in body 2. Display face 35 (tag 4001, 31 vertices) is a plane in body 8. The two bodies sit in one partition and both use node_id 253.
   - `a4ecc6f5`: three pairs (ids 2, 31, 228). Body 2 comes from the partition, body 44493 (15 faces) from LocalBodies. The 15 display faces of the second body carry the section's own ids, which equal the converter's node_id minus 53508 in 15 of 15 cases. 3 of those 15 collide with first-body ids.
2. **The three odd tags are not a record-boundary error either. They are misreads of records that have no tag block.** The geometry ends where the reader thinks (stored bounds validate on all 410 faces of the three parts). After the normals the record is a different shape: the reserved triple is not 0,0,0 and an appearance block follows. The reader reads whatever sits at the tag offset: 16368 is the top of a double 1.0 (`f0 3f 00 00`), 4980815 is UTF-16 "OL" from "SOLIDWORKS" (`4f 00 4c 00`), 65536 is `00 00 01 00`. It is 56 faces, not 3: 33 in `0739c559`, 22 in `7765d286`, 1 in `eefa906d`. No face in those three parts has a readable id.
3. **Two converter problems.** (a) `src/display.js` line 39 accepts any tag. A tag guard rejects exactly the 56 faces and changes nothing else (copy test below). (b) `src/parasolid/partition.js` lines 215 to 219, `merge()`, shifts node_ids of LocalBodies, but the display keeps the unshifted ids. That breaks the display-to-face match used at `src/inspect.js` line 156 in 6 parts (3880 display faces match only after undoing the shift).

## Question 1: shared ids

Corpus: 222 files, 0 parse errors, 21102 display faces, 13589 with a parsed id block (`sweep.json`).

| count | value |
|---|---|
| parts with a repeated rawId | 11 |
| repeated-id groups | 554 (1957 display faces) |
| of those, misreads from question 2 | 2 groups, 55 faces (`0739c559`: 0xFFFFFFFF x33; `7765d286`: 3251011622 x22) |
| real groups | 552 in 9 parts, 1902 faces |
| real groups with members in different bodies | 552 |
| real groups with members in one body | 0 |

Per part (`dups.json`): `d2515121` 325, `d0d61cde` 52, `03764871` 51, `ef1d5cfe` 51, `4803f393` 45, `3c4752f1` 23, `a4ecc6f5` 3, `2f121983` 1, `a3a44709` 1.

How a member is assigned to a body: display (rawId, tag) is matched to a B-rep face by (node_id, surface type), with the id taken as stored or minus merge()'s shift, whichever matches more faces in that body. The tag-to-surface table comes from 7985 id matches in 111 parts with unique ids: 4001 plane, 4002 cylinder, 4003 cone, 4004 sphere, 4005 torus, 4006 B-surface, 4007 blended edge, 4009 swept, 4010 spun. 4001 to 4004 and 4006 also hit another surface type 1% to 2% of the time (for example 4001 on 33 cylinders of 3591). I read that as accidental id matches in parts whose ids are shifted, not as a second meaning of the tag. Not separated further.

Geometry check on the 8 pair members (`geom.json`): distance of the mesh vertices to each candidate surface, in m.

| part, id | display face (tag) | matched face | max deviation | other face with that id |
|---|---|---|---|---|
| 2f121983, 253 | 3 (4002) | cylinder, body 2 | 2.3e-5 | plane 3.4e-2 |
| 2f121983, 253 | 35 (4001) | plane, body 8 | 3.1e-10 | cylinder 1.5e-2 |
| a4ecc6f5, 2 | 945 (4003) | cone, body 2 | 2.5e-4 | cone 9.8e-3 |
| a4ecc6f5, 2 | 960 (4003) | cone, body 44493 | 5.2e-4 | cone 9.9e-3 |
| a4ecc6f5, 31 | 944 (4001) | plane, body 2 | 2.4e-11 | cone 1.0e-2 |
| a4ecc6f5, 31 | 959 (4003) | cone, body 44493 | 5.2e-4 | plane 1.4e-2 |
| a4ecc6f5, 228 | 940 (4001) | plane, body 2 | 5.6e-10 | cylinder 1.4e-3 |
| a4ecc6f5, 228 | 949 (4002) | cylinder, body 44493 | 3.7e-9 | plane 9.5e-3 |

All 8 members are closest to the face I matched by id, by a factor of 19 or more. The planes and one cylinder are at the 1e-9 floor. The other cylinder (2.3e-5) and the three cones (2.5e-4 to 5.2e-4) are over the 1e-6 bar I'd want for an exact fit. I did not find out why; the cone formula (radius = r + t tan(half angle)) is my reading of the B-rep, not checked against a cone with a known answer. The identification rests on the ratio, not on the absolute fit.

Alternatives checked:
- Reader misread: the pair records parse with the same grammar as their neighbours, and the control in question 3 finds the tag at the expected offset in 155 of 155 and 961 of 961 faces of these two parts.
- Periodic face split in two: it predicts two display faces with one tag in one body. 0 of 552 groups look like that. In `2f121983` the pair has two different surface types.
- Duplicate display of one native face: the two members lie on different surfaces (table above).

What the converter does with them (`idmap.json`), re-implementing `inspect.js` line 156 (`byId.has(rawId)`):
- `2f121983`: `native.js` keeps 253 for body 2's cylinder and renumbers body 8's plane to 6958. Both display faces map to the cylinder: 155 matched, 154 distinct targets, reported as "partial".
- `a4ecc6f5`: 949 of 961 display faces match an id, 946 distinct targets. 12 are unselectable and 3 (ids 2, 31, 228) point at the wrong face in body 2.

How far the shift reaches (`idcheck.json`, 115 modern parts, 13532 faces with a known tag): 9504 match with ids as stored, 3880 only after undoing merge()'s shift, 148 neither. The shifted faces sit in 6 parts: `d2515121` 2349, `03764871` 614, `d0d61cde` 450, `ef1d5cfe` 338, `3c4752f1` 115, `a4ecc6f5` 14. Control: matching on id+1 instead hits 192 of 13532 (1.4%), so the "as stored" count includes about that many accidents.

Would a (shift-free id, surface type) key fix the mapping (`fixcheck.json`)? Not alone. It leaves 2 of 961 ambiguous in `a4ecc6f5` but 970 of 2512 in `d2515121`, 259 of 693 in `03764871`. A fix also needs to know the body of each display face. Whether display order follows body order is not checked.

## Question 2: the odd tags

Parts (`sweep.json`, `oddbytes.json`):

| part | faces | odd tag | faces with it | other faces |
|---|---|---|---|---|
| `7765d286` (2019) | 62 | 16368 | 22 | 40 rejected |
| `eefa906d` (2018) | 6 | 65536 | 1 | 5 rejected |
| `0739c559` (2015) | 342 | 4980815 | 33 | 309 rejected |

What a correct reader sees (`scan.json`, `scan2.json`, `variants.json`):
- Boundary: `geometryEnd` is right. The stored bounds (centre, radius to 1e-12) validate on all faces of the three parts, and the three arrays after the 132-byte bounds record parse in every odd record.
- Next field: the reserved triple is `0,0,1` (the 33 of `0739c559`) or `0,1,0xFFFFFFFF` (the 23 of the other two) where the 13533 good records all have `0,0,0`.
- After that comes an appearance block: colour bytes `c0 c0 c0`, MFC strings (`ff fe ff` prefix, for example UTF-16 "SOLIDWORKS Materials|ABS|33", "brushedsteel"), doubles 1.0, 0.8, 0.3, then paths. The id, direction and tag fields are not there.
- Strict scan for the tail grammar (rawId, unit vector, tag 4001 to 4010, 8 doubles, count) anywhere in the record: 0 hits in 410 records of the three parts. Control: 155 of 155 and 961 of 961 faces of `2f121983` and `a4ecc6f5` hit at exactly the reader's offset (the scan also gave 2 extra false hits in `a4ecc6f5`).
- Loosest scan (any u32 from 4001 to 4010 at any byte offset): 0 hits in `7765d286` and `eefa906d`, 2 faces in `0739c559` (faces 100 and 101, at +226 from `geometryEnd`; the bytes there, `a2 0f 00 00 37 80 02 00 00 00`, look like another record shape). Not decoded.

The three odd rawIds are misreads too: 4294967295 (`ff ff ff ff`), 3251011622 (`26 80 c6 c1`, from the appearance block) and 3666608128 (`00 00 8c da`).

How wide the problem is: 19201 faces in 161 modern parts were walked. 13589 parsed, 56 of them odd. 5612 were rejected in 48 parts. Of the rejected, the reserved triple was readable on 938 (`0,0,1` x881, `0,1,0xFFFFFFFF` x45, `0,0,2` x6, `1,96,2` x6) and the arrays did not parse on 4674. I did not decode these variants.

Proposed fix (not applied). `src/display.js` line 39, after `const typeTag=r.u(o)...`, add:

    if(typeTag<4001||typeTag>4010)throw Error('Surface tag '+typeTag+' outside 4001..4010');

The throw sits before `end` is computed, so `extractDisplayLists` records it as `metadataError` as it does for the other rejects. Tried on a copy (`patchcheck.json`): metadata faces go from 13589 to 13533, the 56 changed faces are exactly the odd ones, tag histogram after is 4001 to 4010 only, mesh geometry differs in 0 of 222 files, and `npm test` in the copy gives 27 pass, 0 fail, 41 skipped (the skips were not looked at). A reserved-triple check would pick the same 56 (reserved nonzero: 56 of 56 odd, 0 of 13533 good).

## Question 3: controls (`shiftcheck.json`)

The check re-reads the id block with the read offset moved by a shift and passes a record only if the tag is in 4001..4010, the reserved triple is zero, the edge table fits before the next record, and its id set equals the non-zero Block1 labels.

| test | records | pass |
|---|---|---|
| shift 0, records the reader accepted with a valid tag | 13533 | 13533 |
| shift of -16, -12, -8, -4, -2, -1, +1, +2, +4, +8, +12 or +16 bytes | 13533 each | 0 each (all fail on the tag) |
| record start moved by -8, -4, -1, +1, +4, +8 bytes | 13533 each | 0 each (array header check fails) |
| shift 0 on the 56 odd records | 56 | 0 (all fail on the tag) |

The tag range does most of the work in the shifted cases, so these controls show the check is sensitive to a one-byte move, not that the label cross-check is. The odd records are also flagged by the reserved triple alone (56 of 56), a second signal that does not use the tag.

## Not checked

- Blind prove and disprove agents were not run. The checks above are my own scripts, one method each (id match, geometry distance, raw byte scan).
- Whether display face order follows body order. It decides how to disambiguate shared ids.
- The 148 faces in 4 parts that match neither the stored nor the shifted id (`0132519a`, `543861c9`, `a0ab30c8`, `09d353a9`).
- Tag 4008: one face in the corpus, no id match, so its surface type is unknown here.
- The 5612 rejected modern faces and the 2 faces of `0739c559` that hold a tag value in a different record shape.
- Why curved faces miss the 1e-6 bar in the geometry table.
- Legacy OLE2 files (61 of the 222 files): `metadata()` is not run on them, so none of this covers them.
- The merge() fix itself: I did not build or test one. Suggested direction: keep the section's own node_id on each face (for example `values.section_node_id` before the `+=idOff` at partition.js line 218), carry it through `native.js` as a display id, and match display faces on (display id, surface type, body).

## Scripts and outputs

All in this folder, each with its JSON: `sweep.js`, `bodies.js`, `dups.js`, `geom.js`, `idcheck.js`, `idmap.js`, `fixcheck.js`, `scan.js`, `scan2.js`, `variants.js`, `oddbytes.js`, `shiftcheck.js`, `patchcheck.js` (run with the path of a patched copy; the copy was in the scratchpad and is not kept).
