"""Original 60 s score for 垂城 / VERTICAL PLANET.

The film is ten hard cuts, six seconds each. This cue is written to that grid:
a low D drone opens the planet shot, an industrial pulse lands exactly on the
cut into the engine floor, and every later cut is marked by either an impact,
a riser or a texture change. Nothing is sampled from existing recordings, so
the track is free to use with the film.

Palette: sub drone, detuned additive pads, metallic inharmonic percussion,
filtered noise air, FM bells, and a synthetic hall.

    python tools/score.py [out.wav]

Requires numpy + scipy. Deterministic: same seed, same audio.
"""
import os
import sys
import wave

import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt

SR = 48000
DUR = 60.0
N = int(round(SR * DUR))
SEED = 20261026
rng = np.random.default_rng(SEED)

# D minor is the home key; Bb and F are the two colours used for relief.
D1, D2, D3, D4 = 36.71, 73.42, 146.83, 293.66
A2, A3, A4 = 110.00, 220.00, 440.00
F3, F4 = 174.61, 349.23
BB1, BB2, BB3 = 58.27, 116.54, 233.08
C3, C4, E4 = 130.81, 261.63, 329.63

dry = np.zeros((2, N), dtype=np.float64)
send = np.zeros((2, N), dtype=np.float64)


# --------------------------------------------------------------------------
# primitives
# --------------------------------------------------------------------------
def place(sig, start, gain=1.0, pan=0.0, rev=0.0):
    """Add a mono event into the stereo mix with equal-power panning."""
    i0 = int(round(start * SR))
    if i0 >= N or gain == 0.0:
        return
    n = min(len(sig), N - i0)
    if n <= 0:
        return
    seg = sig[:n] * gain
    gl = np.cos((pan + 1.0) * np.pi / 4.0)
    gr = np.sin((pan + 1.0) * np.pi / 4.0)
    dry[0, i0:i0 + n] += seg * gl
    dry[1, i0:i0 + n] += seg * gr
    if rev:
        send[0, i0:i0 + n] += seg * gl * rev
        send[1, i0:i0 + n] += seg * gr * rev


def fade_slice(n, attack=0.01, release=0.05):
    env = np.ones(n)
    a = max(1, min(n, int(attack * SR)))
    r = max(1, min(n, int(release * SR)))
    env[:a] = np.linspace(0.0, 1.0, a)
    env[-r:] *= np.linspace(1.0, 0.0, r)
    return env


def band_noise(dur, center, width_oct, decay, gain=1.0):
    """Noise shaped by a gaussian band, with an exponential amplitude decay."""
    n = max(8, int(dur * SR))
    x = rng.normal(0.0, 1.0, n)
    spec = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(n, 1.0 / SR)
    freqs[0] = 1e-6
    shape = np.exp(-0.5 * (np.log2(freqs / center) / width_oct) ** 2)
    y = np.fft.irfft(spec * shape, n=n)
    tt = np.arange(n) / SR
    y *= np.exp(-tt * decay)
    peak = np.abs(y).max()
    if peak > 1e-9:
        y /= peak
    return y * gain * fade_slice(n, 0.002, 0.02)


def kick(gain=1.0, pitch=92.0, tail=6.5):
    n = int(0.75 * SR)
    tt = np.arange(n) / SR
    f = pitch * np.exp(-tt * 8.0) + 37.0
    phase = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(phase) * np.exp(-tt * tail)
    click = rng.normal(0.0, 1.0, n) * np.exp(-tt * 120.0) * 0.28
    return (body + click) * gain * fade_slice(n, 0.001, 0.03)


def metal(base=196.0, dur=1.5, gain=1.0):
    """Inharmonic struck metal: four partials plus a short noise edge."""
    n = int(dur * SR)
    tt = np.arange(n) / SR
    sig = np.zeros(n)
    parts = (1.0, 2.76, 5.43, 8.91, 13.2)
    for i, p in enumerate(parts):
        f = base * p * (1.0 + rng.uniform(-0.018, 0.018))
        sig += (np.sin(2 * np.pi * f * tt + rng.uniform(0, 6.28))
                * np.exp(-tt * (2.4 + i * 1.7)) / (i + 1.0))
    edge = band_noise(dur, 4600.0, 1.1, 68.0, 0.85)
    edge = np.pad(edge, (0, max(0, n - len(edge))))[:n]
    return (sig * 0.6 + edge) * gain * fade_slice(n, 0.001, 0.04)


def impact(gain=1.0, size=1.0):
    """Cut accent: sub drop plus a wide, low-passed noise body."""
    n = int(2.4 * size * SR)
    tt = np.arange(n) / SR
    f = 78.0 * np.exp(-tt * 4.5) + 30.0
    phase = 2 * np.pi * np.cumsum(f) / SR
    sub = np.sin(phase) * np.exp(-tt * (2.6 / size))
    body = band_noise(2.4 * size, 240.0, 1.8, 2.2, 0.7)
    body = np.pad(body, (0, max(0, n - len(body))))[:n]
    ring = metal(84.0, 2.0 * size, 0.20)
    ring = np.pad(ring, (0, max(0, n - len(ring))))[:n]
    return (sub * 0.9 + body * 0.55 + ring) * gain


def riser(dur=1.3, gain=1.0, lo=160.0, hi=1250.0):
    """Noise + sweep that lifts into the next cut."""
    n = int(dur * SR)
    tt = np.arange(n) / SR
    u = tt / dur
    f = lo * (hi / lo) ** (u ** 1.6)
    phase = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sin(phase) * 0.55 + np.sin(phase * 1.5) * 0.22
    air = band_noise(dur, 2200.0, 2.2, 0.0, 1.0)
    air = np.pad(air, (0, max(0, n - len(air))))[:n] * (u ** 2)
    return (tone * (u ** 2.2) + air * 0.7) * gain * fade_slice(n, 0.05, 0.005)


def bell(freq, dur=3.4, gain=1.0):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    index = 5.5 * np.exp(-tt * 2.0)
    mod = np.sin(2 * np.pi * freq * 2.01 * tt) * index
    car = np.sin(2 * np.pi * freq * tt + mod)
    car += 0.28 * np.sin(2 * np.pi * freq * 3.0 * tt + mod * 0.5) * np.exp(-tt * 2.4)
    env = np.exp(-tt * 1.45) * (1.0 - np.exp(-tt * 260.0))
    return car * env * gain


def bass_note(freq, dur=0.62, gain=1.0, bright=1.0):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    sig = (np.sin(2 * np.pi * freq * tt)
           + 0.42 * np.sin(2 * np.pi * freq * 2 * tt)
           + 0.18 * bright * np.sin(2 * np.pi * freq * 3 * tt)
           + 0.09 * bright * np.sin(2 * np.pi * freq * 4 * tt))
    env = np.exp(-tt * 7.0) * (1.0 - np.exp(-tt * 320.0))
    return sig * env * gain * fade_slice(n, 0.004, 0.05)


def tick(gain=1.0):
    return band_noise(0.075, 3400.0, 0.9, 95.0, gain)


def hat(gain=1.0):
    return band_noise(0.16, 7600.0, 1.0, 52.0, gain)


def pad(start, dur, notes, gain=1.0, bright=0.5, attack=0.9, release=1.6,
        detune=0.0013, lfo=0.11):
    """Detuned additive pad placed as a block; no per-note panning needed."""
    n = int((dur + release) * SR)
    tt = np.arange(n) / SR
    sig = np.zeros(n)
    for f in notes:
        for d in (-detune, 0.0, detune):
            ff = f * (1.0 + d)
            phase0 = rng.uniform(0, 6.28)
            vib = 1.0 + 0.0009 * np.sin(2 * np.pi * (lfo + rng.uniform(0, 0.05)) * tt + rng.uniform(0, 6.28))
            for k in range(1, 13):
                fk = ff * k
                if fk > 9000:
                    break
                w = (1.0 / k) * np.exp(-fk / (900.0 + 2600.0 * bright))
                sig += w * np.sin(2 * np.pi * fk * tt * vib + phase0 * k)
    env = np.ones(n)
    a = max(1, int(attack * SR))
    env[:a] = np.linspace(0, 1, a) ** 1.4
    r = max(1, int(release * SR))
    env[-r:] *= np.linspace(1, 0, r) ** 1.2
    env *= 0.85 + 0.15 * np.sin(2 * np.pi * 0.07 * tt + rng.uniform(0, 6.28))
    sig *= env
    peak = np.abs(sig).max()
    if peak > 1e-9:
        sig /= peak
    i0 = int(round(start * SR))
    n2 = min(len(sig), N - i0)
    if n2 <= 0:
        return
    seg = sig[:n2] * gain
    # Wide but not fully mono: opposite slow drift per channel.
    dry[0, i0:i0 + n2] += seg * 0.96
    dry[1, i0:i0 + n2] += seg * 0.96
    send[0, i0:i0 + n2] += seg * 0.72
    send[1, i0:i0 + n2] += seg * 0.72


# --------------------------------------------------------------------------
# continuous beds
# --------------------------------------------------------------------------
tt = np.arange(N) / SR

# Sub drone, deepest in the shaft sections.
sub_env = np.clip(tt / 4.5, 0, 1) ** 1.6
sub_env *= np.where(tt < 54.0, 1.0, np.clip((60.0 - tt) / 5.0, 0, 1))
# The fundamental carries weight; the 2nd/3rd harmonics keep the drone audible
# on small speakers, where 36 Hz simply does not reproduce.
sub = (np.sin(2 * np.pi * D1 * tt)
       + 0.34 * np.sin(2 * np.pi * D1 * 2 * tt + 0.7)
       + 0.16 * np.sin(2 * np.pi * D1 * 3 * tt + 1.9)
       + 0.10 * np.sin(2 * np.pi * D1 * 4 * tt + 0.3))
sub *= (0.78 + 0.22 * np.sin(2 * np.pi * 0.047 * tt))
sub *= sub_env * 0.20
dry[0] += sub
dry[1] += sub * 0.985

# Air / ventilation bed.
air = band_noise(DUR, 760.0, 2.1, 0.0, 1.0)
air = np.pad(air, (0, max(0, N - len(air))))[:N]
air *= (0.55 + 0.45 * np.sin(2 * np.pi * 0.031 * tt + 1.2)) * 0.085
# Machine hum: two close partials beating slowly around 200 Hz.
hum = (0.5 * np.sin(2 * np.pi * 196.0 * tt)
       + 0.4 * np.sin(2 * np.pi * 200.5 * tt + 0.6)
       + 0.2 * np.sin(2 * np.pi * 392.0 * tt + 1.4))
hum *= (0.6 + 0.4 * np.sin(2 * np.pi * 0.019 * tt + 0.4)) * 0.020
place(hum, 0.0, 1.0, 0.0, 0.30)
place(air, 0.0, 1.0, 0.0, 0.35)
shimmer = band_noise(DUR, 5200.0, 0.7, 0.0, 1.0)
shimmer = np.pad(shimmer, (0, max(0, N - len(shimmer))))[:N]
shimmer *= (0.5 + 0.5 * np.sin(2 * np.pi * 0.083 * tt)) * 0.10
place(shimmer, 0.0, 1.0, 0.0, 0.5)
# Second air layer: high, very quiet, and only above the shaft sections so the
# surface world has a sense of open atmosphere.
air_hi = band_noise(DUR, 9200.0, 0.55, 0.0, 1.0)
air_hi = np.pad(air_hi, (0, max(0, N - len(air_hi))))[:N]
surface = np.clip((tt - 17.0) / 8.0, 0, 1) * np.clip((52.0 - tt) / 6.0, 0, 1)
air_hi *= surface * (0.6 + 0.4 * np.sin(2 * np.pi * 0.061 * tt + 0.8)) * 0.048
place(air_hi, 0.0, 1.0, 0.15, 0.55)


# --------------------------------------------------------------------------
# pads, one block per section, overlapped slightly into the cuts
# --------------------------------------------------------------------------
# Section 1-2: Dm, closed and dark.
pad(0.0, 6.6, [D2, A2, D3, F3], 0.34, bright=0.30, attack=2.2, release=2.0)
pad(6.0, 6.6, [D2, A2, D3, F3], 0.38, bright=0.46, attack=0.5, release=1.8)

# Section 3: shanty layer, add Bb underneath for weight.
pad(12.0, 6.6, [D2, A2, BB2, D3], 0.36, bright=0.42, attack=0.6, release=1.6)

# Section 4: market, warm Bb major, a little more open.
pad(18.0, 6.6, [BB1, F3, BB2, D3], 0.38, bright=0.55, attack=0.5, release=1.6)

# Section 5: factory, back to Dm with a hard edge.
pad(24.0, 6.6, [D2, A2, F3, C4], 0.40, bright=0.50, attack=0.4, release=1.5)

# Section 6: interchange, F major lift.
pad(30.0, 6.6, [F3, C4, A3, F4], 0.37, bright=0.60, attack=0.5, release=1.5)

# Section 7: biosphere, high and airy.
pad(36.0, 6.6, [BB2, F4, BB3, D4], 0.34, bright=0.68, attack=1.2, release=1.8)

# Section 8: crown, widest voicing of the film.
pad(42.0, 6.6, [D3, A3, D4, E4, F4], 0.42, bright=0.64, attack=0.55, release=1.7)

# Section 9: descent, dark Bb with a suspended A.
pad(48.0, 6.6, [BB1, F3, A3, BB3], 0.34, bright=0.36, attack=0.9, release=1.8)

# Section 10: closing chord, long tail against the picture fade.
pad(54.0, 4.4, [D2, A2, D3, E4, F4, A4], 0.44, bright=0.52, attack=0.35, release=3.6)


# --------------------------------------------------------------------------
# percussion and events
# --------------------------------------------------------------------------
BAR = 6.0
BEAT = 1.0  # 60 BPM: one beat per second, nine-beat phrases match the cuts


def clank_layer(start, bars=1, density=0.35, gain=0.22, base=(150.0, 270.0)):
    for b in range(bars):
        for k in range(6):
            if rng.random() > density:
                continue
            t = start + b * BAR + k * BEAT + rng.uniform(0.02, 0.55)
            place(metal(rng.uniform(*base), rng.uniform(0.8, 1.8), 1.0),
                  t, gain * rng.uniform(0.55, 1.0), rng.uniform(-0.8, 0.8), 0.35)


# 05.85 - a soft hit into the shaft.
place(impact(0.55, 0.8), 5.85, 1.0, 0.0, 0.55)

# 6-18: engine and shanty. Heartbeat plus metal.
for i in range(12):
    t = 6.0 + i * 1.0
    if i % 6 in (0, 2, 5):
        place(kick(0.85 if i % 6 == 0 else 0.55), t, 1.0, 0.0, 0.12)
    if i % 6 == 3:
        place(kick(0.45, pitch=120.0, tail=9.0), t + 0.5, 1.0, 0.12, 0.10)
clank_layer(6.0, bars=2, density=0.30, gain=0.30)
clank_layer(12.0, bars=1, density=0.45, gain=0.34)

# Bass pulse from the shanty layer on.
for i in range(6):
    place(bass_note(D2, 0.6, 0.30, 0.7), 12.0 + i * 1.0, 1.0, 0.0, 0.10)

# 18-24: market. Same pulse, warmer bass, bells enter.
for i in range(6):
    place(bass_note(BB1, 0.66, 0.30, 0.8), 18.0 + i * 1.0, 1.0, 0.0, 0.12)
    if i % 2 == 0:
        place(kick(0.72, pitch=86.0), 18.0 + i * 1.0, 1.0, 0.0, 0.14)
for t, f, g in [(18.4, D4, 0.42), (19.6, F4, 0.36), (21.0, A4, 0.33), (22.4, C4, 0.30)]:
    place(bell(f, 3.0, g), t, 1.0, rng.uniform(-0.4, 0.4), 0.85)
clank_layer(18.0, bars=1, density=0.25, gain=0.22, base=(260.0, 420.0))

# 24-30: factory. Heavier kit and a riser into the interchange.
for i in range(6):
    place(kick(0.95 if i % 3 == 0 else 0.6, pitch=96.0), 24.0 + i * 1.0, 1.0, 0.0, 0.12)
    place(bass_note(D2, 0.5, 0.30, 1.0), 24.0 + i * 1.0, 1.0, 0.0, 0.10)
clank_layer(24.0, bars=1, density=0.65, gain=0.34, base=(140.0, 240.0))
for i in range(12):
    place(hat(0.16 if i % 2 else 0.11), 24.25 + i * 0.5, 1.0, -0.35 if i % 2 else 0.35, 0.2)
place(riser(1.35, 0.42), 28.65, 1.0, 0.0, 0.6)

# 30-36: interchange. Eighth-note ticks and a moving arp.
for i in range(12):
    t = 30.0 + i * 0.5
    place(tick(0.13 if i % 2 else 0.20), t, 1.0, -0.25 if i % 2 else 0.25, 0.25)
for i in range(6):
    place(kick(0.85 if i % 2 == 0 else 0.5), 30.0 + i * 1.0, 1.0, 0.0, 0.12)
for i in range(12):
    place(hat(0.18 if i % 2 == 0 else 0.12), 30.25 + i * 0.5, 1.0, 0.4 if i % 2 else -0.4, 0.22)
arp = [D3, F3, A3, D4, F4, A4]
for i in range(24):
    f = arp[i % len(arp)]
    place(bass_note(f, 0.34, 0.085, 1.2), 30.0 + i * 0.25, 1.0, -0.45 if i % 2 else 0.45, 0.45)

# 36-42: biosphere. Strip the kit, keep air, bells and a slow pulse.
for i in range(6):
    if i in (0, 3):
        place(kick(0.5, pitch=82.0, tail=9.0), 36.0 + i * 1.0, 1.0, 0.0, 0.30)
for t, f, g in [(36.5, A4, 0.32), (38.0, F4, 0.29), (39.4, D4, 0.26), (40.8, C4, 0.23)]:
    place(bell(f, 4.0, g), t, 1.0, rng.uniform(-0.5, 0.5), 0.95)
clank_layer(36.0, bars=1, density=0.14, gain=0.16, base=(420.0, 700.0))

# 42-48: crown. Big cut, full arrangement.
place(impact(0.95, 1.3), 42.0, 1.0, 0.0, 0.7)
for i in range(6):
    place(kick(1.0 if i % 3 == 0 else 0.62, pitch=94.0), 42.0 + i * 1.0, 1.0, 0.0, 0.14)
    place(bass_note(D2, 0.5, 0.32, 1.0), 42.0 + i * 1.0, 1.0, 0.0, 0.12)
for i in range(12):
    place(hat(0.19 if i % 2 == 0 else 0.13), 42.2 + i * 0.5, 1.0, -0.4 if i % 2 else 0.4, 0.25)
for i in range(18):
    f = arp[i % len(arp)] * 2
    place(bass_note(f, 0.3, 0.06, 1.3), 42.0 + i * 0.333, 1.0, -0.5 if i % 2 else 0.5, 0.5)
for t, f, g in [(42.6, A4, 0.36), (44.2, F4, 0.31), (46.0, D4, 0.28)]:
    place(bell(f, 3.4, g), t, 1.0, rng.uniform(-0.5, 0.5), 0.9)
clank_layer(42.0, bars=1, density=0.45, gain=0.30, base=(180.0, 300.0))

# 48-54: basin. Drop the beat, deepen the sub, sparse metal, riser out.
place(impact(0.6, 1.0), 48.0, 1.0, 0.0, 0.65)
for i in range(6):
    if i in (0, 2, 5):
        place(kick(0.55, pitch=76.0, tail=5.0), 48.0 + i * 1.0, 1.0, 0.0, 0.25)
clank_layer(48.0, bars=1, density=0.18, gain=0.20, base=(90.0, 170.0))
place(riser(1.5, 0.5, lo=120.0, hi=900.0), 52.4, 1.0, 0.0, 0.7)

# 54-60: closing. One last impact, a single bell, then let the hall ring out.
place(impact(1.0, 1.6), 54.0, 1.0, 0.0, 0.85)
place(bell(D4, 5.4, 0.40), 54.9, 1.0, 0.0, 0.95)
place(bell(A4, 5.0, 0.26), 56.1, 1.0, -0.3, 0.95)


# --------------------------------------------------------------------------
# synthetic hall + master
# --------------------------------------------------------------------------
def make_ir(seconds=2.9):
    n = int(seconds * SR)
    noise = np.random.default_rng(SEED + 7).normal(0.0, 1.0, (2, n))
    spec = np.fft.rfft(noise, axis=1)
    freqs = np.fft.rfftfreq(n, 1.0 / SR)
    freqs[0] = 1e-6
    # Highs decay faster than lows, as in a real concrete hall.
    tilt = 1.0 / (1.0 + (freqs / 2200.0) ** 2) ** 0.55
    ir = np.fft.irfft(spec * tilt, n=n, axis=1)
    env = np.exp(-np.arange(n) / (SR * 0.62))
    ir *= env
    fade_in = min(n, int(0.014 * SR))
    ir[:, :fade_in] *= np.linspace(0.0, 1.0, fade_in)
    ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True)) + 1e-9
    return ir


ir = make_ir()
wet = np.stack([fftconvolve(send[0], ir[0])[:N], fftconvolve(send[1], ir[1])[:N]])
mix = dry + wet * 0.62

# Remove sub-30 Hz rumble, then apply a broad tonal tilt: less boom, more
# presence, so the mix still reads on laptop speakers.
sos_hp = butter(2, 30.0, btype='highpass', fs=SR, output='sos')
sos_low = butter(2, 70.0, btype='lowpass', fs=SR, output='sos')
sos_mid = butter(2, 1800.0, btype='highpass', fs=SR, output='sos')
mix = sosfilt(sos_hp, mix, axis=1)
low = sosfilt(sos_low, mix, axis=1)
mix = mix - low * 0.46
high = sosfilt(sos_mid, mix, axis=1)
mix = mix + high * 0.22
# A little air above 3 kHz keeps the metal and the bells from sounding dull.
sos_air = butter(2, 3000.0, btype='highpass', fs=SR, output='sos')
mix = mix + sosfilt(sos_air, mix, axis=1) * 0.38

# Slow overall fade so the music follows the picture's fade to black.
fade = np.ones(N)
fade[:int(0.35 * SR)] = np.linspace(0, 1, int(0.35 * SR))
tail = int(1.9 * SR)
fade[-tail:] *= np.linspace(1, 0, tail) ** 1.5
mix *= fade

peak = np.abs(mix).max()
if peak > 0:
    mix = mix / peak * 1.12
mix = np.tanh(mix) / np.tanh(1.12)
mix *= 0.89 / max(1e-9, np.abs(mix).max())

rms = np.sqrt((mix ** 2).mean())
print(f'peak {20 * np.log10(np.abs(mix).max() + 1e-12):.2f} dBFS  '
      f'rms {20 * np.log10(rms + 1e-12):.2f} dBFS')

# Per-section level report: useful to confirm the arrangement has dynamics.
for s in range(10):
    a, b = int(s * 6 * SR), int((s + 1) * 6 * SR)
    seg = mix[:, a:b]
    print(f'  shot {s + 1:02d}  rms {20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-12):6.2f} dBFS')


def write_wav(path, data):
    pcm = np.clip(data.T, -1.0, 1.0)
    pcm = (pcm * 32767.0).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, 'score_60s.wav')
    write_wav(out, mix)
    print('written', out, round(os.path.getsize(out) / 1024 / 1024, 1), 'MB')
