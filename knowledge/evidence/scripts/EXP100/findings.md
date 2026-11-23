# EXP100: do display typeTags 4010 and 4008 mean SPUN_SURF and OFFSET_SURF?

## Verdict: partly holds

The tag-to-surface mapping holds for 4010 (spun) and 4008 (offset) by the rawId join and by
geometry, within the limits below. Three parts of the claim fail:

1. The 8 display parameters do not hold an axis for 4010. All 290 tag-4010 records (286 in
   a4ecc6f5, 4 in 8cd79ff5) have all eight parameters equal to zero.
2. The display `direction` is not reliably the axis. In a4ecc6f5 it is parallel to the native
   SPUN_SURF axis on 260 faces and perpendicular on 24. In 8cd79ff5 it is perpendicular on 4 of 4.
3. "rawId equals native node id" is not an identity. Duplicate rawIds produce wrong-type joins
   (see below).

Counts are right only when both parts are added: 286 + 4 = 290. a4ecc6f5 alone has 286.

## Counts (measured)

| part | display faces | tag counts | rawId join (tag -> native type) | unjoined |
|---|---|---|---|---|
| a4ecc6f5 | 961 | 4001:112, 4002:124, 4003:127, 4006:312, 4010:286 | 4010 -> spun 284; 4002 -> cylinder 119, plane 1; 4003 -> cone 126, plane 1; 4001 -> plane 106; 4006 -> bspline 312 | 12 (4001:6, 4002:4, 4010:2) |
| 8cd79ff5 | 103 | 4001:51, 4002:42, 4003:6, 4010:4 | 4010 -> spun 4; 4002 -> cylinder 42; 4003 -> cone 6; 4001 -> plane 51 | 0 |
| 2f121983 | 155 | 4001:30, 4002:51, 4003:1, 4004:8, 4005:9, 4006:19, 4007:27, 4008:1, 4009:9 | 4008 -> offset 1; 4001 -> plane 29, cylinder 1; 4002 -> cylinder 51; 4003 -> cone 1; 4004 -> sphere 8; 4005 -> torus 9; 4006 -> bspline 19; 4007 -> blend 27; 4009 -> swept 9 | 0 |

- Duplicate rawIds: 3 in a4ecc6f5, 1 in 2f121983.
- Joined to something other than the claimed type: 0 of 290 for 4010, 0 of 1 for 4008.
  Joined to the wrong type: 3 faces, all on duplicate rawIds (a4ecc6f5: one 4002 and one 4003
  face, the 4003 one is rawId 31; 2f121983: one 4001 face). Duplicate-id as the cause is likely,
  not verified face by face.
- Unjoined 4010 faces: 2 in a4ecc6f5 (rawIds 64 and 47). No native face has that id.

## Geometry (measured)

Bar: 1e-8 m for the distance of display mesh vertices to the joined native surface. The bar is
stated before the run. Controls failed it, so the bar is not met by the display mesh (see below).

Distance of display vertices to the joined surface, metres:

| part | tag | surface | mean | max | over 1e-8 |
|---|---|---|---|---|---|
| a4ecc6f5 | 4010 | spun | 6.2e-6 | 2.5e-4 | 2588 of 13575 |
| a4ecc6f5 | 4002 (control) | cylinder | 2.6e-4 | 9.5e-3 | 681 of 2041 |
| a4ecc6f5 | 4003 (control) | cone | 9.6e-4 | 1.4e-2 | 1150 of 3071 |
| a4ecc6f5 | 4001 (control) | plane | 3e-10 | 2.5e-9 | 0 of 3871 |
| 8cd79ff5 | 4010 | spun | 2.9e-7 | 5.7e-6 | 90 of 672 |
| 8cd79ff5 | 4002 (control) | cylinder | 1.1e-6 | 1.1e-5 | 283 of 1303 |
| 8cd79ff5 | 4003 (control) | cone | 1.0e-6 | 7.8e-6 | 336 of 1116 |
| 8cd79ff5 | 4001 (control) | plane | 7e-11 | 1.7e-10 | 0 of 1046 |
| 2f121983 | 4008 | offset | 1.0e-5 | 3.7e-5 | 67 of 121 |
| 2f121983 | 4002 (control) | cylinder | 3.8e-6 | 4.2e-5 | 862 of 3337 |
| 2f121983 | 4003 (control) | cone | 6.6e-6 | 3.0e-5 | 78 of 227 |
| 2f121983 | 4004 (control) | sphere | 3e-10 | 1.6e-9 | 0 of 702 |

Reading:

- The planes and spheres fit at 1e-9. The mesh frame and units are right.
- The cylinders and cones miss by up to 0.3% of their radius (11 um on a 3 mm radius, 0.25 mm on
  an 81 mm radius). The cause is not checked. Mesh-to-surface error at this size is not
  decided here.
- So the 1e-8 bar cannot separate spun from cylinder at the vertex level. The spun residuals are
  of the same order as the controls and not smaller in any consistent way.
- The 4002 max in a4ecc6f5 includes faces joined to the wrong type, not separated.

Offset (4008, 2f121983): the vertices sit at distance |d| from the basis to within 3.7e-5 m max,
mean 1.0e-5, n=121. d = -0.0004 m. The basis is a SWEPT surface, not a plain surface. The
residual is at the control noise level.

Axis test: normal-meridian check (a surface of revolution's normals lie in the meridian plane
through the native axis; sin of the angle between normal and the plane should be 0).
Bar: 1e-5 max sin per face, set after seeing the control range (controls max 6.4e-6).

- a4ecc6f5 tag 4010: 248 faces pass, 36 fail. Worst 0.036 (about 2.1 degrees).
- 8cd79ff5 tag 4010: 3 pass, 1 fails (raw 1031, sin 1.2e-3).
- Controls (4002, 4003) pass in all three parts: max sin 6.4e-6 in a4ecc6f5, 7e-8 in 8cd79ff5.

Degenerate evaluator: one native node (1227, a spun with profile circle) returns d = 0 with a
zero normal at every probe. Its cause is not checked. It made the blind matcher report
distance 0 for 12 unrelated faces. Those results are void.

## Parameters and direction (measured)

- Tag 4010 (290 records): all 8 parameters = 0. Test fails.
- Tag 4008 (1 record): all 8 = 0.
- Control tag 4002: parameter index 6 equals the native cylinder radius (0.08128 in a4ecc6f5).
  Control tag 4003 also carries values. The parameters hold geometry for controls and nothing for
  4010.
- Display direction vs native spun axis, a4ecc6f5: parallel 260, perpendicular 24, other 0.
  8cd79ff5: perpendicular 4 of 4. Controls 4002 and 4003: parallel in every case.

## Blind check

No blind agent was spawned. Done by me, with scripts in this folder.

- Blind 3-point best-fit over all native faces (no ID input), run on the 12 unjoined faces:
  invalid. All 12 matched node 1227 at distance 0.
- Joined 4010 faces, probed for exact zero: 0 faces with any zero probe (a4ecc6f5 284, 8cd79ff5 4).

## Not checked

- The 2 unjoined 4010 faces (rawIds 64 and 47): what they are.
- Why the 36 a4ecc6f5 spun faces fail the normal-meridian bar (worst 2 degrees).
- Why cylinder and cone vertices miss their surface by 0.3% of radius. This sets the floor for
  the 1e-8 bar.
- Why node 1227 returns d = 0 with a zero normal.
- Which face in each duplicate-rawId pair the join picks, and whether the wrong type follows
  from it.
- A blind best-fit for the 4010 faces with a fixed evaluator. Only the joined faces were
  checked.
- Whether the display `direction` means anything for 4010 (it is not the native axis on 24 of
  284 faces in a4ecc6f5, and on 4 of 4 in 8cd79ff5).

## Scripts

All in `scripts/EXP100/`:

- `explore.js`: first pass, tag counts, joins, sample records.
- `params.js`: parameter and direction values by tag.
- `analysis.js`: join crosstab, vertex-to-surface distances, axis tests. Output: `results.json`.
  The blind step is off by default (`BLIND=0`); it timed out at 900 s on the full corpus.
- `diag.js`, `diag2.js`: per-face residuals; the offset test; spun axis per face.
- `final.js`: spun direction and normal-meridian counts; blind check of unclassified faces.
  Output: `final.json`. The blind result for the 12 faces is void (node 1227).
- `node1227.js`, `degen.js`: the degenerate-node check and exact-zero count.
