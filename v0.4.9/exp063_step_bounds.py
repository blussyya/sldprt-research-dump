"""Compare DisplayLists bounding-record union with independent STEP geometry bounds.
Requires cadquery-ocp. No triangulation used in OpenCascade bound calculation.
"""
from pathlib import Path
import gzip,json,hashlib,importlib.metadata,re
from OCP.STEPControl import STEPControl_Reader
from OCP.IFSelect import IFSelect_RetDone
from OCP.Bnd import Bnd_Box
from OCP.BRepBndLib import BRepBndLib
ROOT=Path(__file__).resolve().parents[1]
sha=lambda b:hashlib.sha256(b).hexdigest()
auditpath=ROOT/'v0.4.9/EXP062_RESULTS.json.gz'
audit=json.loads(gzip.decompress(auditpath.read_bytes()))
rows=[]
for item in audit['modern']:
    if not item['file'].startswith('test files new/SW2022/'):continue
    native=ROOT/item['file']; assert sha(native.read_bytes())==item['sha256']
    step=native.with_suffix('.step')
    assert re.search(r'SI_UNIT\s*\(\s*\.MILLI\.\s*,\s*\.METRE\.',step.read_text()), 'unexpected units'
    reader=STEPControl_Reader();assert reader.ReadFile(str(step))==IFSelect_RetDone
    assert reader.TransferRoots()>0
    shape=reader.OneShape(); box=Bnd_Box()
    BRepBndLib.AddOptimal_s(shape,box,False,False)
    # STEP reader's default target unit is mm; supplied exports declare millimetres.
    raw=list(box.Get()); ref=[v/1000 for v in raw]
    toleranceBox=Bnd_Box();BRepBndLib.AddOptimal_s(shape,toleranceBox,False,True)
    toleranceRef=[v/1000 for v in toleranceBox.Get()]
    faces=item['faces']
    stored=[min(f['min'][k] for f in faces) for k in range(3)]+[max(f['max'][k] for f in faces) for k in range(3)]
    mesh=[min(f['meshMin'][k] for f in faces) for k in range(3)]+[max(f['meshMax'][k] for f in faces) for k in range(3)]
    rows.append(dict(file=item['file'],nativeSHA256=item['sha256'],stepSHA256=sha(step.read_bytes()),stepBoundsMetres=ref,stepBoundsWithShapeToleranceMetres=toleranceRef,storedBoundsMetres=stored,meshBoundsMetres=mesh,storedMaxAbsError=max(abs(a-b) for a,b in zip(ref,stored)),meshMaxAbsError=max(abs(a-b) for a,b in zip(ref,mesh))))
cube=next(r for r in rows if '/C00_' in r['file'])
assert max(abs(a-b) for a,b in zip(cube['stepBoundsMetres'],[0,0,0,.01,.01,.01]))<1e-12, 'unit/orientation control'
result=dict(experiment='EXP-063',date='2026-09-21',baseCommit='32cc4410b0b130242791ba2984640bc268b65a4d',scriptSHA256=sha(Path(__file__).read_bytes()),auditSHA256=sha(auditpath.read_bytes()),ocpVersion=importlib.metadata.version('cadquery-ocp'),method='OCP BRepBndLib.AddOptimal(shape, box, useTriangulation=False, useShapeTolerance=False); default STEP target mm converted to metres; whole-model union only',rows=rows)
result['summary']={str(t):sum(r['storedMaxAbsError']<=t for r in rows) for t in [1e-12,1e-9,1e-7,1e-6]}
(ROOT/'v0.4.9/EXP063_RESULTS.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result['summary']))
for r in rows:print(Path(r['file']).parent.name,'stored',format(r['storedMaxAbsError'],'.9g'),'mesh',format(r['meshMaxAbsError'],'.9g'))
