"""Render the promo film frame-by-frame from the live page and encode an MP4.

The page owns the camera timeline and the cinematic grade; this script only
asks for frames in batches (synchronous XHR so it works even when the tab is
throttled), writes them to disk, then composites captions/letterbox and hands
the sequence to ffmpeg.
"""
import base64
import json
import os
import sys
import time

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
FRAMES = os.path.join(ROOT, 'film_frames')
CLEAN = os.path.join(ROOT, 'film_clean')
OUT_MP4 = os.environ.get(
    'FILM_OUT',
    os.path.abspath(os.path.join(ROOT, '..', 'dist', '垂城-城市宣传片_VERTICAL_PLANET.mp4')),
)
W, H = 1920, 1080
FPS = 24
TOTAL = 1440

os.makedirs(FRAMES, exist_ok=True)
os.makedirs(CLEAN, exist_ok=True)


def find_font(size, bold=False):
    candidates = [
        (r'C:\Windows\Fonts\msyhbd.ttc' if bold else r'C:\Windows\Fonts\msyh.ttc'),
        r'C:\Windows\Fonts\msyh.ttc',
        r'C:\Windows\Fonts\simhei.ttf',
        r'C:\Windows\Fonts\arialbd.ttf' if bold else r'C:\Windows\Fonts\arial.ttf',
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


F_ZONE = find_font(30, bold=True)
F_ZONE_EN = find_font(15)
F_TITLE = find_font(112, bold=True)
F_TITLE_EN = find_font(22)
F_SUB = find_font(24)
F_SMALL = find_font(14)


# --------------------------------------------------------------------------
# Caption cards: (start, end, zone index, zone name, english, altitude)
# These are burned into the frames so the film needs no external assets.
# --------------------------------------------------------------------------
CARDS = [
    (6.8, 12.4, '01', '机舱层', 'SUBSTRATA / ENGINE FLOOR', '-1,000 M — 0 M'),
    (12.8, 18.2, '02', '竖井棚户', 'SHAFT HOUSING / SELF-BUILT', '-600 M — -100 M'),
    (18.8, 24.2, '03', '九层集市', 'LOWLINE / CANAL MARKET', '0 M — 200 M'),
    (24.8, 30.2, '03', '工厂带', 'FACTORY BELT / AUTOMATED', '0 M — 200 M'),
    (30.8, 36.2, '04', '云际立交', 'AERIAL INTERCHANGE', '+200 M — +660 M'),
    (36.8, 42.2, '05', '栖木悬园', 'BIOME TERRACE / GROWN LIGHT', '+620 M — +1,200 M'),
    (42.8, 48.2, '05', '天穹塔群', 'UPPER AIR / TOWER CROWNS', '+1,200 M — +2,000 M'),
    (48.8, 54.2, '06', '回收盆底', 'RECLAIM BASIN / THE HUMAN LAYER', '-420 M — -980 M'),
]


def card_alpha(t, start, end, fade=0.65):
    if t < start or t > end:
        return 0.0
    if t - start < fade:
        return (t - start) / fade
    if end - t < fade:
        return (end - t) / fade
    return 1.0


def add_text_track(img, t):
    """Zone captions, opening title and closing card."""
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    # Zone captions, lower left, above the letterbox.
    for start, end, num, name, en, alt in CARDS:
        a = card_alpha(t, start, end)
        if a <= 0:
            continue
        x, y = 132, 806
        col = (255, 150, 74, int(255 * a))
        white = (232, 226, 214, int(255 * a))
        dim = (150, 148, 140, int(190 * a))
        d.line([(x - 34, y + 20), (x - 10, y + 20)], fill=col, width=2)
        d.text((x - 2, y - 4), num, font=F_ZONE_EN, fill=col)
        d.text((x + 34, y - 14), name, font=F_ZONE, fill=white)
        d.text((x + 36, y + 26), en, font=F_ZONE_EN, fill=dim)
        d.text((x + 36, y + 46), alt, font=F_SMALL, fill=dim)

    # Opening title: fades in 0.6-2.2 s, out by 5.4 s.
    ta = 0.0
    if 0.5 <= t <= 5.4:
        ta = min(1.0, (t - 0.5) / 1.5)
        if t > 4.2:
            ta = max(0.0, 1.0 - (t - 4.2) / 1.2)
    if ta > 0:
        cx = W // 2
        title = '垂城'
        tw = d.textlength(title, font=F_TITLE)
        d.text((cx - tw / 2, 372), title, font=F_TITLE, fill=(236, 231, 219, int(250 * ta)))
        en = 'V E R T I C A L   P L A N E T'
        ew = d.textlength(en, font=F_TITLE_EN)
        d.text((cx - ew / 2, 520), en, font=F_TITLE_EN, fill=(255, 150, 74, int(235 * ta)))
        rule_y = 566
        d.line([(cx - 190, rule_y), (cx + 190, rule_y)], fill=(255, 150, 74, int(120 * ta)), width=1)
        sub = 'OEKUMENE-09  ·  A PLANET COVERED ENTIRELY BY CITY'
        sw = d.textlength(sub, font=F_SMALL)
        d.text((cx - sw / 2, 588), sub, font=F_SMALL, fill=(178, 174, 163, int(210 * ta)))

    # Closing card over the final hero shot.
    ca = 0.0
    if t >= 56.0:
        ca = min(1.0, (t - 56.0) / 1.4)
    if ca > 0:
        cx = W // 2
        big = '垂城'
        bw = d.textlength(big, font=find_font(96, bold=True))
        d.text((cx - bw / 2, 420), big, font=find_font(96, bold=True), fill=(240, 236, 226, int(246 * ca)))
        en = 'VERTICAL PLANET'
        ew = d.textlength(en, font=F_TITLE_EN)
        d.text((cx - ew / 2, 552), en, font=F_TITLE_EN, fill=(255, 150, 74, int(235 * ca)))
        sub = '从 -1,000 米到 +2,000 米，垂直交通是唯一的法律'
        sw = d.textlength(sub, font=F_SUB)
        d.text((cx - sw / 2, 604), sub, font=F_SUB, fill=(196, 191, 180, int(220 * ca)))
        tag = 'INDUSTRIAL MEGACITY  ·  FULL PLANET COVERAGE 99.87%'
        tw2 = d.textlength(tag, font=F_SMALL)
        d.text((cx - tw2 / 2, 650), tag, font=F_SMALL, fill=(140, 138, 131, int(200 * ca)))

    if layer.getbbox():
        # grade_frame works in RGB, so composite through an RGBA copy.
        base = img.convert('RGBA')
        base.alpha_composite(layer)
        img.paste(base.convert('RGB'))


def grade_frame(img, t):
    """Global finishing: letterbox, fade in/out, subtle warm grade."""
    arr = np.asarray(img.convert('RGB')).astype(np.float32) / 255.0

    # Cinematic 2.39:1 letterbox inside the 16:9 frame.
    bar = int((H - W / 2.39) / 2)
    arr[:bar, :, :] *= 0.0
    arr[H - bar:, :, :] *= 0.0

    # Fade from / to black.
    fade = 1.0
    if t < 1.2:
        fade = t / 1.2
    if t > 58.4:
        fade = max(0.0, (60.0 - t) / 1.6)
    if fade < 1.0:
        arr *= max(0.0, fade)

    out = Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8), 'RGB')
    add_text_track(out, t)
    return out


def composite(raw_path, out_path, t):
    img = Image.open(raw_path)
    if img.size != (W, H):
        img = img.resize((W, H), Image.LANCZOS)
    frame = grade_frame(img, t)
    frame.save(out_path, quality=95, subsampling=1)
    return out_path


def encode():
    import imageio_ffmpeg
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    pattern = os.path.join(CLEAN, 'f%05d.png')
    cmd = [
        exe, '-y',
        '-framerate', str(FPS),
        '-i', pattern,
        '-c:v', 'libx264',
        '-preset', 'slow',
        '-crf', '17',
        '-pix_fmt', 'yuv420p',
        '-profile:v', 'high',
        '-level', '4.1',
        '-movflags', '+faststart',
        '-an',
        OUT_MP4,
    ]
    print(' '.join(cmd), flush=True)
    import subprocess
    subprocess.run(cmd, check=True)
    return OUT_MP4
