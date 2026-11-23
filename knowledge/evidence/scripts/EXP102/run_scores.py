# EXP-102: run score.py over each tie group (converter matches, >1) and the controls.
# Output: out/scores.json. Reads out/choose.json for the converter's match sets (box test, not re-derived here).
import json, functools, numpy as np
import sys; sys.path.insert(0, "/home/user/dump-validation/knowledge/evidence/scripts/EXP102")
import score as S

EXP = S.EXP
choose = json.load(open(f'{EXP}/out/choose.json'))['choose']
load = functools.lru_cache(maxsize=None)(S.load_step)
out = {'targets': {}, 'controls': {}, 'identity': {}}

def pair_score(t, c, shift=(0, 0, 0)):
    return S.score(t, c, shift=shift, dm=True)

targets = [t for t, r in choose.items() if len(r['matches']) > 1]
for t in targets:
    rows = []
    for c in choose[t]['matches']:
        rows.append(pair_score(t, c))
    rows.sort(key=lambda r: (r['score_mm'], r['ang_md_p99_rad']))
    out['targets'][t] = {
        'converterPick': choose[t]['pick'], 'fits': choose[t]['matches'],
        'myPick': rows[0]['cand'], 'myRanking': [(r['cand'], r['score_mm'], r['ang_md_p99_rad']) for r in rows],
        'selfScore_mm': next(r['score_mm'] for r in rows if r['cand'] == t) if any(r['cand'] == t for r in rows) else None,
        'runnerUp_mm': rows[1]['score_mm'] if len(rows) > 1 else None,
    }
    print(t, 'conv', choose[t]['pick'], 'mine', rows[0]['cand'], 'score', '%.3e' % rows[0]['score_mm'],
          'runnerUp', '%.3e' % rows[1]['score_mm'] if len(rows) > 1 else '-', flush=True)

# Controls: (a) self-match floor per target, (b) display shifted 0.01 mm in x against its own STEP must read 0.01 mm
for t in targets:
    base = pair_score(t, t)
    shifted = S.score(t, t, shift=(0.01, 0.0, 0.0), dm=True)
    out['controls'][t] = {'self_score_mm': base['score_mm'], 'self_pos_md_mm': base['pos_md_max_mm'],
                          'self_pos_dm_mm': base['pos_dm_max_mm'], 'shift_0.01mm_score_mm': shifted['score_mm']}

# Identity: STEP vs STEP for converter tie pairs, both directions, sample nodes to the other's triangles.
ties = [('C00_cube_10mm', 'C22_cube_sw2011_native'), ('C13_cone', 'C25_cone_sw2011_native'),
        ('C04_cube_hole_5mm', 'C26_cube_hole_sw2011_native'), ('C03_cube_fillet_1mm', 'C12_cube_fillet_1mm_edge2'),
        ('C04_cube_hole_5mm', 'C06_cube_hole_moved'), ('C00_cube_10mm', 'C18_cube_split_line'),
        ('C07_cube_two_holes', 'C08_cube_second_hole_modified'), ('C05_cube_hole_3mm', 'C11_cube_hole_4mm'),
        ('C03_cube_fillet_1mm', 'C09_cube_chamfer_1mm'), ('C04_cube_hole_5mm', 'C05_cube_hole_3mm')]
def md_dist(P, V, T):
    A, B, C = V[T[:, 0]], V[T[:, 1]], V[T[:, 2]]
    out = np.empty(len(P))
    for s0 in range(0, len(P), 400):
        D = S.point_tri_dist(P[s0:s0 + 400], A, B, C)
        out[s0:s0 + 400] = np.where(np.isnan(D), np.inf, D).min(axis=1)
    return out

for a, b in ties:
    sa, Pa, Na, Ka, Ta = load(a); sb, Pb, Nb, Kb, Tb = load(b)
    # surface samples of A against B's fine mesh (1e-3 mm deflection), and the reverse
    dab = md_dist(Pa, Kb, Tb)
    dba = md_dist(Pb, Ka, Ta)
    out['identity'][a + ' vs ' + b] = {'a_samples_to_b_mm_max': float(dab.max()), 'b_samples_to_a_mm_max': float(dba.max())}
    print('identity', a, b, '%.3e' % max(dab.max(), dba.max()), flush=True)

json.dump(out, open(f'{EXP}/out/scores.json', 'w'), indent=1, default=float)
print('wrote scores.json')
