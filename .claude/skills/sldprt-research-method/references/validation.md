# Validation

How to check an export or a fact against something independent. Our own code checking our own
output doesn't count: it shares our assumptions.

## References to compare against, best first

1. SolidWorks' own exports of the same part (STEP, x_t). The control parts and Kevin's SW2026
   exports are in `test files online/2013/exports-SW2026/`.
2. OpenCascade (`pip install cadquery-ocp`, import as `OCP`): a separate B-rep kernel.
3. Closed forms: a plane, cylinder or sphere you can write down.
4. A second save of the same part from a newer SolidWorks.

## Mesh against STEP (OpenCascade)

`scripts/measure.py` measures the distance from every STL vertex and every triangle centroid to
the STEP body:

```bash
python3 -I scripts/measure.py part.STEP mesh.stl out.csv 4
```

- It prints max, mean, median and counts over 0.001, 0.01, 0.05, 0.1 and 0.5 mm for vertices and
  centroids separately. Vertices show position errors; centroids also show chord sag.
- CSV columns: kind (0 vertex, 1 centroid), i, x, y, z, dist_mm, step_face.
- Speed is about 8.5 points a second per core, so a 30k-point mesh takes about 30 minutes on 4.
  Run it in the background (Bash `run_in_background`) and wait for the notification.
- OCP API gotchas: `Bnd_Box.Get()` doesn't work, use `CornerMin()`/`CornerMax()`. Use
  `TopoDS.Face(...)`, not `TopoDS.Face_s`.
- Control: the SW2026 mesh against the SW2026 STEP gave a max of 0.0011 mm on vertices. If a
  known-good pair doesn't come out near that, the measurement is wrong, not the mesh.

Then find where the error is, not just how big: group by `step_face`, plot coloured by distance
from a useful view, and look at the worst faces by hand.

## Per-face checks

When one region is off, compare face by face:

- For planar faces, the signed offset along the normal tells you if a face moved, and by how much
  (head_back faces 23/24/26/31 were 0.10 mm higher).
- Compare areas. An area change with no offset means the outline changed.
- Faces with no match on the other side are added or removed geometry. List them.

## B-rep fit checks

- The bar is 1e-8 m for fitted curves and surfaces.
- The fitter's own check samples a few points per interval and can miss mid-span errors (edge 826
  on head_back passed the fitter but measured 1.12e-8 m with a dense check). Check densely, and
  with a different evaluator where you can.
- `knowledge/evidence/scripts/EXP086/hberr.js` lists every fit over 1e-8 m for a part.

## Staleness

Before blaming the decoder for a mesh that disagrees with the B-rep, compare `DLUpdateStamp`
with the change counter in `ModelStamps`. `scripts/stamps.js` prints both, plus the History and
Biography strings. A gap means the mesh may be from an older state of the model. It's a reason to
check, not proof: confirm with a geometry check.

## Regression sweeps

Before a converter commit: `npm test`, then the online-sample sweep against the last baseline
(command in START_HERE.md). Run sweeps one at a time. Two at once starve each other and a part
times out that would pass alone.

## Reporting a check

Always give: what was compared to what, the bar, the control and its result, max / mean / count
over, and where the worst points are. Keep the script and the raw output next to the evidence file.
