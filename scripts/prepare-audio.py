"""Rebuild the small CC0/public-domain sound bank. Requires numpy and ffmpeg or macOS afconvert.

Usage: python3 scripts/prepare-audio.py /path/to/source-cache
Source files are cached outside the repository; no downloads occur at game runtime.
"""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import urllib.request
import wave

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/audio'
CACHE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('/tmp/pen-fight-audio-research')
SOURCES = {
    'flick': {'name': 'pen flick 2.wav', 'author': 'mywhats', 'source': 'https://freesound.org/people/mywhats/sounds/175526/', 'download': 'https://cdn.freesound.org/previews/175/175526_1084891-hq.mp3', 'license': 'CC0-1.0', 'file': 'flick.mp3'},
    'floor': {'name': 'Pen drop on floor.wav', 'author': 'shark510', 'source': 'https://freesound.org/people/shark510/sounds/346386/', 'download': 'https://cdn.freesound.org/previews/346/346386_4487893-hq.mp3', 'license': 'CC0-1.0', 'file': 'floor.mp3'},
    'slide': {'name': 'Slide', 'author': 'Mokozuz', 'source': 'https://freesound.org/people/Mokozuz/sounds/370737/', 'download': 'https://cdn.freesound.org/previews/370/370737_6827920-hq.mp3', 'license': 'CC0-1.0', 'file': 'slide.mp3'},
    'fan': {'name': 'Electric fan #1', 'author': 'Joseph SARDIN / BigSoundBank', 'source': 'https://bigsoundbank.com/electric-fan-1-s0078.html', 'download': 'https://bigsoundbank.com/UPLOAD/bwf-en/0078.wav', 'license': 'CC0-1.0', 'file': 'fan-alt.wav'},
    'classroom': {'name': 'Classroom Ambiance', 'author': 'rcrossley', 'source': 'https://soundbible.com/1561-Classroom-Ambiance.html', 'download': 'https://soundbible.com/mp3/Classroom%20Ambiance-SoundBible.com-922889313.mp3', 'license': 'Public Domain (source declaration)', 'file': 'room-alt.mp3'},
}


def read_source(key, rate):
    info = SOURCES[key]
    raw = CACHE / info['file']
    if not raw.exists():
        with urllib.request.urlopen(info['download'], timeout=30) as response:
            raw.write_bytes(response.read())
    info['sourceSha256'] = hashlib.sha256(raw.read_bytes()).hexdigest()
    pcm = CACHE / f'{key}-{rate}-decoded.wav'
    if shutil.which('ffmpeg'):
        cmd = ['ffmpeg', '-v', 'error', '-y', '-i', str(raw), '-ar', str(rate), '-ac', '1', '-c:a', 'pcm_s16le', str(pcm)]
    else:
        cmd = ['afconvert', '-f', 'WAVE', '-d', f'LEI16@{rate}', '-c', '1', str(raw), str(pcm)]
    subprocess.run(cmd, check=True)
    with wave.open(str(pcm)) as audio:
        return np.frombuffer(audio.readframes(audio.getnframes()), dtype='<i2').astype(float) / 32768


def filtered(x, rate, low, high):
    x = x - np.mean(x)
    spectrum = np.fft.rfft(x)
    hz = np.fft.rfftfreq(len(x), 1 / rate)
    # Smooth frequency edges avoid resonant brick-wall ringing.
    curve = (hz / (hz + low)) ** 2 / (1 + (hz / high) ** 4)
    return np.fft.irfft(spectrum * curve, n=len(x))


def seamless(x, rate, seconds):
    size = int(rate * seconds)
    t = np.linspace(0, 1, size)
    join = x[-size:] * (1 - t) + x[:size] * t
    return np.concatenate((x[size:-size], join))


CACHE.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
raw = {key: read_source(key, 24000 if key in ['fan', 'classroom'] else 32000) for key in SOURCES}
# One-off edits retain natural variation. Contacts use different bounces of a real pen.
recipes = [
    ('pen-flick.wav', 'flick', .045, .25, 100, 10000, .76, 0),
    ('pen-contact-a.wav', 'floor', .272, .385, 140, 7000, .70, 0),
    ('pen-contact-b.wav', 'floor', .395, .505, 140, 6200, .66, 0),
    ('pen-contact-c.wav', 'floor', .555, .705, 140, 7600, .70, 0),
    ('pen-drop.wav', 'floor', .268, 1.02, 100, 10000, .76, 0),
    ('pen-slide-loop.wav', 'slide', .85, 2.78, 230, 3600, .35, .18),
    ('fan-loop.wav', 'fan', .5, 8.5, 45, 1800, .40, .4),
    ('classroom-loop.wav', 'classroom', 4, 16, 200, 1500, .55, .65),
]
assets = []
for filename, key, start, end, low, high, peak, crossfade in recipes:
    rate = 24000 if key in ['fan', 'classroom'] else 32000
    x = filtered(raw[key][int(start * rate):int(end * rate)].copy(), rate, low, high)
    if crossfade:
        x = seamless(x, rate, crossfade)
    else:
        fade = min(int(.002 * rate), len(x) // 4)
        x[:fade] *= np.linspace(0, 1, fade)
        tail = min(int(.018 * rate), len(x) // 4)
        x[-tail:] *= np.linspace(1, 0, tail)
    x *= peak / max(.0001, float(np.max(np.abs(x))))
    target = OUT / filename
    with wave.open(str(target), 'wb') as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(rate)
        audio.writeframes(np.round(x * 32767).astype('<i2').tobytes())
    assets.append({'file': filename, 'source': key, 'sourceStart': start, 'sourceEnd': end, 'highpassHz': low, 'lowpassHz': high, 'loopCrossfadeSeconds': crossfade, 'sampleRate': rate, 'duration': round(len(x) / rate, 6), 'bytes': target.stat().st_size, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
manifest = {'retrieved': '2026-10-19', 'sources': SOURCES, 'assets': assets}
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'files': len(assets), 'bytes': sum(a['bytes'] for a in assets), 'durations': {a['file']: a['duration'] for a in assets}}, indent=2))
