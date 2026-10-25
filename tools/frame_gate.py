"""Objective frame gate for the promo film.

Flags frames whose centre is blocked by a near-camera structure (a wide
contiguous run of fully dark columns), or that are essentially blank. This is
what stops a camera that sits too close to geometry from reaching the encoder.
"""
import os
import re
import sys

import numpy as np
from PIL import Image

FRAMES = os.environ.get(
    'FILM_FRAMES',
    os.path.join(os.path.dirname(os.path.abspath(__file__)), 'film_frames'),
)


def stats(path):
    im = Image.open(path).convert('L').resize((240, 135), Image.BILINEAR)
    a = np.asarray(im).astype(np.float32) / 255.0
    dark = a < 0.06
    cols = dark.mean(axis=0)
    # Longest contiguous run of columns that are almost entirely dark.
    best = 0
    run = 0
    best_start = 0
    run_start = 0
    for i, v in enumerate(cols):
        if v > 0.88:
            if run == 0:
                run_start = i
            run += 1
            if run > best:
                best = run
                best_start = run_start
        else:
            run = 0
    coverage = best / 240.0
    centre_hit = best_start < 168 and (best_start + best) > 72
    return {
        'mean': round(float(a.mean()), 4),
        'darkCols': round(float(best), 1),
        'coverage': round(coverage, 3),
        'centreBlocked': bool(centre_hit and coverage > 0.14),
    }


def scan():
    files = sorted(f for f in os.listdir(FRAMES) if re.match(r'^f\d{5}\.', f))
    blocked, blank = [], []
    for f in files:
        s = stats(os.path.join(FRAMES, f))
        if s['mean'] < 0.012:
            blank.append(f)
        if s['centreBlocked']:
            blocked.append(f)
    return files, blocked, blank


def group(files):
    """Collapse frame names into contiguous index runs for readable reporting."""
    if not files:
        return []
    idx = sorted(int(re.search(r'(\d+)', f).group(1)) for f in files)
    out = []
    start = prev = idx[0]
    for i in idx[1:]:
        if i == prev + 1:
            prev = i
            continue
        out.append((start, prev))
        start = prev = i
    out.append((start, prev))
    return out


if __name__ == '__main__':
    files, blocked, blank = scan()
    print('frames', len(files))
    print('blank runs', group(blank))
    print('blocked runs', group(blocked))
    if blocked[:4]:
        for f in blocked[:4]:
            print(f, stats(os.path.join(FRAMES, f)))
