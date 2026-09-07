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
RAIL_MODES = [(390,.120,.07),(617,.145,.11),(943,.115,.10),
              (1379,.095,.10),(1883,.080,.085),(2531,.065,.08),
              (3271,.048,.065),(4187,.035,.045)]


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


def highpass(x, cutoff=120):
    """Fourth-order Butterworth high-pass, with cyclic filter warmup."""
    warm = min(RATE, len(x))
    output = x[-warm:]+x
    omega = 2*math.pi*cutoff/RATE
    cosine = math.cos(omega)
    for q in (.5411961001, 1.3065629649):
        alpha = math.sin(omega)/(2*q)
        b0 = (1+cosine)/(2*(1+alpha))
        a1, a2 = -2*cosine/(1+alpha), (1-alpha)/(1+alpha)
        x1 = x2 = y1 = y2 = 0
        filtered = []
        for v in output:
            y = b0*(v-2*x1+x2)-a1*y1-a2*y2
            filtered.append(y)
            x2, x1, y2, y1 = x1, v, y1, y
        output = filtered
    return output[warm:]


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
        # Retain the real contact attack, while shortening the muffled carriage
        # body so that the rail response is distinct from the initial knock.
        bright = bandpass(original, 2900, .7)
        body = [(v+1.3*h)*(.55+.45*math.exp(-max(0,i/RATE-.025)/.035))
                for i,(v,h) in enumerate(zip(original, bright))]
        body += [0.0]*(int(1.0*RATE)-len(body))
        exciter = [v*max(0, min(1, (.040-i/RATE)/.015)) for i,v in enumerate(body)]
        # Inharmonic modes approximate damped steel vibration, excited solely
        # by the recorded contact. Multiple modes avoid a single bell note.

        resonance = [0.0]*len(body)
        peak = max(map(abs, original))
        for frequency, decay, amount in RAIL_MODES:
            frequency *= 1+(index-3.5)*.002
            ring = normalize(bandpass(exciter, frequency, math.pi*frequency*decay*(.96/.61)), peak*amount)
            resonance = [a+b for a,b in zip(resonance,ring)]
        # Small, irregular early returns thicken rail vibration without a room
        # reverb or separately timed second wheel strike. They share its emitter.
        for delay, amount in [(.0073,.22),(.0131,-.15),(.0227,.10),(.0379,.055),(.061,.045),(.089,-.03),(.127,.02)]:
            frames = round(delay*RATE)
            for i in range(frames,len(body)):
                body[i] += resonance[i-frames]*amount
        body = [a+b for a,b in zip(body,resonance)]
        for i in range(len(body)):
            body[i] *= min(1,i/96,(len(body)-1-i)/7200)
        sample['url'] = sample['id']+'-rail-reverb.wav'
        write(sample['url'],body)
        sample['description'] = 'Recorded contact with sharpened 2.9 kHz attack, shortened carriage thump, eight recording-excited rail modes and quiet early returns; 1000 ms total with extended rail resonance and 150 ms final fade, original 10 ms onset retained.'



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
    # The approved impact modes, continuously excited by recorded rail texture.
    # A one-second cyclic preroll lets slow modes settle before the usable audio.
    warm = RATE
    excitation = x[-warm:]+x
    resonance = [0.0]*len(x)
    for frequency, decay, amount in RAIL_MODES:
        band = normalize(bandpass(excitation, frequency, math.pi*frequency*decay)[warm:])
        resonance = [a+amount*b for a,b in zip(resonance,band)]
    reflected = resonance.copy()
    for delay, amount in [(.0073,.22),(.0131,-.15),(.0227,.10),(.0379,.055)]:
        frames = round(delay*RATE)
        for i in range(len(reflected)):
            reflected[i] += resonance[(i-frames)%len(resonance)]*amount
    # Keep the existing recorded rumble dominant; match energy before blending.
    dry_energy = sum(v*v for v in texture)
    wet_energy = sum(v*v for v in reflected)
    wet_gain = .45*math.sqrt(dry_energy/max(wet_energy,1e-12))
    texture = [a+wet_gain*b for a,b in zip(texture,reflected)]
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
    sample['url'] = 'rolling-rail.wav'
    sample['loopEnd'] = len(mixed)/RATE
    sample['description'] = 'Original 98–108 s rolling recording, 90–4200 Hz, transient control, broad metal texture plus the same eight damped rail modes and early returns as the impact layer, blended with the original bass bed; 150 ms cyclic crossfade.'
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
