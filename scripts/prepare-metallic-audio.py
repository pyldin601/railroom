"""Deterministic, recording-excited metal colour. Requires ffmpeg; no Python packages.
Keeps original WAVs and motor/brake assets intact. See AUDIO-LICENSES.md.
"""
import array
import json
import math
import subprocess
import sys
import wave
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
OUT = APP/'public/audio'
RATE = 48000


def pcm(raw, code):
    values = array.array(code)
    values.frombytes(raw)
    if sys.byteorder != 'little':
        values.byteswap()
    return values


def read(name):
    with wave.open(str(OUT/name)) as w:
        assert (w.getnchannels(), w.getsampwidth(), w.getframerate()) == (1, 2, RATE)
        return [v/32768 for v in pcm(w.readframes(w.getnframes()), 'h')]


def decode(source, start, duration, filters):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(APP/'audio-sources'/source),
                          '-ss', str(start), '-t', str(duration), '-af', filters,
                          '-ac', '1', '-ar', str(RATE), '-f', 'f32le', 'pipe:1'],
                         check=True, capture_output=True).stdout
    return list(pcm(raw, 'f'))


def normalize(x, peak=1):
    scale = peak/max(max(map(abs, x)), 1e-12)
    return [v*scale for v in x]


def bandpass(x, frequency, q):
    # Constant-peak RBJ bandpass, excited by the recording, with no oscillators.
    omega = 2*math.pi*frequency/RATE
    alpha = math.sin(omega)/(2*q)
    b = alpha/(1+alpha)
    a1, a2 = -2*math.cos(omega)/(1+alpha), (1-alpha)/(1+alpha)
    x1 = x2 = y1 = y2 = 0
    out = []
    for v in x:
        y = b*(v-x2)-a1*y1-a2*y2
        out.append(y)
        x2, x1, y2, y1 = x1, v, y1, y
    return out


def write(name, x):
    x = normalize(x, .5)
    values = array.array('h', (round(v*32767) for v in x))
    if sys.byteorder != 'little':
        values.byteswap()
    with wave.open(str(OUT/name), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(values.tobytes())
    return x


def impacts(manifest):
    for index, sample in enumerate(s for s in manifest['samples'] if s['kind'] == 'joint'):
        original = read(sample['id']+'.wav')
        # Same recorded onset and attack, with more upper-mid transient detail.
        bright = bandpass(original, 2400, .65)
        body = [v+.85*h for v, h in zip(original, bright)]
        body += [0.0]*(int(.30*RATE)-len(body))
        # Only the first 35 ms excites the resonators, avoiding sustained hiss.
        exciter = [v*max(0, min(1, (.035-i/RATE)/.012)) for i, v in enumerate(body)]
        for frequency, decay, amount in [(610,.070,.12),(1130,.045,.11),(2070,.027,.08),(3460,.015,.045)]:
            frequency *= 1+(index-3.5)*.003
            q = math.pi*frequency*decay
            ring = normalize(bandpass(exciter, frequency, q), max(map(abs, original))*amount)
            body = [a+b for a, b in zip(body, ring)]
        for i in range(len(body)):
            body[i] *= min(1, i/96, (len(body)-1-i)/960)
        sample['url'] = sample['id']+'-metal.wav'
        write(sample['url'], body)
        sample['description'] = 'Recorded 160 ms wheel impact with upper-mid attack emphasis and recording-excited damped metal resonances; 300 ms total, original 10 ms onset retained.'


def rolling(manifest):
    sample = next(s for s in manifest['samples'] if s['kind'] == 'rolling')
    x = decode('complete_train_ride_PD.ogg', 98, 10,
               'highpass=f=90,lowpass=f=4200')
    # Fast peak follower tames already-recorded knocks in the rolling bed.
    # Their timing must not compete with the independently scheduled joints.
    envelope = 0
    release = math.exp(-1/(RATE*.12))
    for i, v in enumerate(x):
        envelope = max(abs(v), envelope*release)
        x[i] = v*min(1, .08/max(envelope, 1e-9))
    x = normalize(x)
    texture = [v*.6 for v in x]
    for frequency, q, level in [(430,2.2,.20),(870,3.1,.27),(1630,4,.20),(2780,3.5,.09)]:
        band = normalize(bandpass(x, frequency, q))
        texture = [a+level*b for a, b in zip(texture, band)]
    # Crossfade cyclically after filtering so filter startup is also hidden.
    fade = int(.15*RATE)
    loop = texture[fade:-fade]+[
        texture[-fade+i]*math.cos(i/(fade-1)*math.pi/2)+
        texture[i]*math.sin(i/(fade-1)*math.pi/2) for i in range(fade)]
    bass = normalize(read('rolling.wav'))
    assert len(bass) == len(loop)
    mixed = [.48*b+.72*t for b, t in zip(bass, loop)]
    # Correct only the tiny boundary step over 1 ms, not a fade-to-silence dip.
    delta = mixed[0]-mixed[-1]
    for i in range(48):
        mixed[-48+i] += delta*(i/47)**2
    sample['url'] = 'rolling-metal.wav'
    sample['loopEnd'] = len(mixed)/RATE
    sample['description'] = 'Original 98–108 s rolling recording, 90–4200 Hz, transient control and broad metal resonances blended with the original bass bed; 150 ms cyclic crossfade.'
    write(sample['url'], mixed)


if __name__ == '__main__':
    path = OUT/'manifest.json'
    manifest = json.loads(path.read_text())
    impacts(manifest)
    rolling(manifest)
    manifest['name'] = 'Field recordings · metallic rail texture'
    manifest['description'] = 'Recorded wheel/rail sounds shaped for harder metallic carriage character. Mixed source trains, not a verified Ukrainian vehicle recording. Motor and brake assets unchanged.'
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
    print('Prepared eight metallic impact variants and the metallic rolling bed.')
