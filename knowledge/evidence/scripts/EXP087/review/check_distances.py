import csv
from pathlib import Path

source = Path(__file__).resolve().parents[1] / 'stlstep'
for name in ('dist.csv', 'dist-2026.csv'):
    with (source / name).open() as stream:
        rows = [list(map(float, row)) for row in csv.reader(line for line in stream if not line.startswith('#'))]
    distant = [row for row in rows if row[5] > 0.1]
    outside = [row for row in rows if not (-29 <= row[2] <= 29 and 28 <= row[3] <= 50)]
    print(name, 'samples:', len(rows), 'unique:', len({(row[0], row[1]) for row in rows}))
    print('over 0.1 mm:', len(distant), 'maximum outside box:', max(row[5] for row in outside))
    if distant:
        print('bounds:', [(min(row[i] for row in distant), max(row[i] for row in distant)) for i in (2, 3, 4)])
