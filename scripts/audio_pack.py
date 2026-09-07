"""Reproduce the approved pack from original recordings, then validate before install.

The initial PCM conversion and fade/filter order preserve the approved samples.
Do not collapse those passes: intermediate rounding changes the sound files.
"""
import argparse
import array
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import wave

ROOT = Path(__file__).resolve().parents[1]
SHIPPED = ROOT / 'public/audio'
RATE = 48000
SOURCES = {
    'joint': ('wheel_knocking_in_wagon_CC0.ogg', 'https://commons.wikimedia.org/wiki/File:Стук_колёс_поезда.ogg', 'CC0-1.0', 'Ural-66'),
    'rolling': ('complete_train_ride_PD.ogg', 'https://commons.wikimedia.org/wiki/File:Complete_train_ride_4_minutes.ogg', 'Public domain', 'stephan'),
    'traction': ('e233_acceleration_CC0.ogg', 'https://commons.wikimedia.org/wiki/File:E233-3000Accelerate.ogg', 'CC0-1.0', 'E217'),
    'brake': ('e231_deceleration_CC0.ogg', 'https://commons.wikimedia.org/wiki/File:E231Deceleration.ogg', 'CC0-1.0', 'E217'),
}
ASSETS = {f'joint-{i}': ('joint', f'joint-{i}-rail-reverb.wav') for i in range(1, 9)}
ASSETS.update(rolling=('rolling', 'rolling-rail.wav'), traction=('traction', 'traction-tonal.wav'),
              **{'brake-tone': ('brake-tone', 'brake-tone.wav'), 'brake-hiss': ('brake-hiss', 'brake-hiss.wav')})


def load_script(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(name+'.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def provenance(kind):
    _, source, license_name, author = SOURCES[kind]
    return dict(source=source, license=license_name, author=author)


def ffmpeg_pcm(ffmpeg, arguments, raw=None):
    result = subprocess.run([ffmpeg, '-v', 'error', *map(str, arguments)], input=raw,
                            check=True, capture_output=True)
    return result.stdout


def original_base(kind, source_dir, ffmpeg, audio):
    """Recreate the original research PCM excerpt before the later mono filters."""
    if kind == 'joint':
        start, duration, channels, fade_in, fade_out, offset, length = 60, 24, 1, .08, .25, 0, 24
        filters = 'highpass=f=160,lowpass=f=6500'
    else:
        start, duration, channels, fade_in, fade_out, offset, length = 90, 40, 2, .25, .5, 8, 10
        filters = 'highpass=f=40,lowpass=f=300'
    fades = f'afade=t=in:st=0:d={fade_in},afade=t=out:st={duration-fade_out}:d={fade_out}'
    intermediate = ffmpeg_pcm(ffmpeg, ['-ss', start, '-i', source_dir/SOURCES[kind][0],
        '-t', duration, '-af', fades, '-ar', RATE, '-ac', channels, '-f', 's16le', 'pipe:1'])
    filtered = ffmpeg_pcm(ffmpeg, ['-f', 's16le', '-ar', RATE, '-ac', channels, '-i', 'pipe:0',
        '-ss', offset, '-t', length, '-af', filters, '-ac', 1, '-ar', RATE, '-f', 's16le', 'pipe:1'], intermediate)
    return [v/32768 for v in audio.pcm(filtered, 'h')]


def write_base(directory, name, samples):
    # Preserve the original extraction's arithmetic order and PCM quantization.
    peak = max(map(abs, samples)) or 1
    values = array.array('h', (round(max(-1, min(1, v/peak*.5))*32767) for v in samples))
    write_pcm(directory/name, values)


def write_pcm(path, values):
    if sys.byteorder != 'little':
        values.byteswap()
    with wave.open(str(path), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes(values.tobytes())


def prepare_bases(directory, source_dir, ffmpeg, audio):
    samples = []
    signal = original_base('joint', source_dir, ffmpeg, audio)
    block = 240
    energies = [sum(v*v for v in signal[i:i+block])/block for i in range(0, len(signal), block)]
    peaks = []
    for index in sorted(range(5, len(energies)-40), key=lambda i: energies[i], reverse=True):
        if all(abs(index-other) > 100 for other in peaks):
            peaks.append(index)
        if len(peaks) == 8:
            break
    for number, index in enumerate(sorted(peaks), 1):
        start = max(0, index*block-480)
        clip = signal[start:start+7680]
        for i in range(len(clip)):
            clip[i] *= min(1, i/96, (len(clip)-1-i)/1800)
        name = f'joint-{number}.wav'
        write_base(directory, name, clip)
        samples.append(dict(id=f'joint-{number}', kind='joint', url=name, **provenance('joint'),
            onset=.01, gain=.75, sourceOffsetSeconds=60+start/RATE,
            description='160 ms filtered excerpt of real in-wagon wheel impact; includes carriage resonance'))
    rolling = original_base('rolling', source_dir, ffmpeg, audio)
    fade = int(.15*RATE)
    loop = rolling[fade:-fade]+[rolling[-fade+i]*math.cos(i/(fade-1)*math.pi/2)+
                               rolling[i]*math.sin(i/(fade-1)*math.pi/2) for i in range(fade)]
    write_base(directory, 'rolling.wav', loop)
    samples.append(dict(id='rolling', kind='rolling', url='rolling.wav', **provenance('rolling'),
        onset=0, gain=1, loopStart=0, loopEnd=len(loop)/RATE, sourceOffsetSeconds=98,
        description='Filtered mono field-recording excerpt with a 150 ms equal-power seam crossfade'))

    raw = ffmpeg_pcm(ffmpeg, ['-i', source_dir/SOURCES['traction'][0], '-ss', 18, '-t', 1,
        '-af', 'highpass=f=160,lowpass=f=1500', '-ac', 1, '-ar', RATE, '-f', 's16le', 'pipe:1'])
    tonal = audio.pcm(raw, 'h')
    peak = max(map(abs, tonal))
    # This revision used 16383, rather than 32767*.5, as its integer peak target.
    write_pcm(directory/'traction-tonal.wav', array.array('h', (round(v/peak*16383) for v in tonal)))
    samples.append(dict(id='traction', kind='traction', url='traction-tonal.wav', **provenance('traction'),
        onset=0, gain=1, loopStart=0, loopEnd=1.0, sourceOffsetSeconds=18,
        description='Motor-dominated 18–19 s excerpt, mono, high-pass 160 Hz and low-pass 1500 Hz; normalized to -6 dBFS. Used as pitch-controlled, phase-aligned grains; not played as a one-second loop.'))
    samples.append(dict(id='brake', kind='brake', **provenance('brake')))
    return dict(name='Field recordings · metallic rail texture',
        description='Recorded wheel/rail sounds shaped for harder metallic carriage character. Mixed source trains, not a verified Ukrainian vehicle recording. Motor and brake assets unchanged.', samples=samples)


def validate_pack(directory):
    """Reject missing layers, unsafe URLs, damaged PCM, and missing provenance."""
    directory = Path(directory)
    try:
        manifest = json.loads((directory/'manifest.json').read_text())
        samples = manifest['samples']
        if len(samples) != len(ASSETS) or {s['id'] for s in samples} != ASSETS.keys():
            raise ValueError('Pack must contain all twelve current recording layers exactly once')
        for sample in samples:
            kind, filename = ASSETS[sample['id']]
            if sample['kind'] != kind or sample['url'] != filename:
                raise ValueError(f'Unexpected kind or asset path for {sample["id"]}')
            source_kind = 'brake' if kind.startswith('brake-') else kind
            if any(sample.get(key) != value for key, value in provenance(source_kind).items()):
                raise ValueError(f'Missing or incorrect provenance for {filename}')
            if not sample.get('description') or not math.isfinite(sample['sourceOffsetSeconds']) or sample['sourceOffsetSeconds'] < 0:
                raise ValueError(f'Missing extraction provenance for {filename}')
            path = directory/filename
            if path.is_symlink():
                raise ValueError(f'Asset must be a regular file: {filename}')
            with wave.open(str(path), 'rb') as wav:
                if (wav.getnchannels(), wav.getsampwidth(), wav.getframerate(), wav.getcomptype()) != (1, 2, RATE, 'NONE'):
                    raise ValueError(f'Expected mono 48 kHz, 16-bit PCM: {filename}')
                frames = wav.getnframes()
                raw = wav.readframes(frames)
                if frames <= 0 or len(raw) != frames*2:
                    raise ValueError(f'Empty or truncated WAV: {filename}')
                pcm = array.array('h', raw)
                if sys.byteorder != 'little':
                    pcm.byteswap()
                if not 0 < max(map(abs, pcm)) <= 16417:
                    raise ValueError(f'Silent or unexpectedly loud WAV: {filename}')
                duration = frames/RATE
                if not 0 <= sample['onset'] < duration or not math.isfinite(sample['gain']) or sample['gain'] < 0:
                    raise ValueError(f'Invalid onset or gain: {filename}')
                if 'loopEnd' in sample and not 0 <= sample['loopStart'] < sample['loopEnd'] <= duration:
                    raise ValueError(f'Invalid loop interval: {filename}')
        return manifest
    except (OSError, KeyError, TypeError, wave.Error, EOFError) as error:
        raise ValueError(f'Invalid audio pack in {directory}: {error}') from error


def pack_names(manifest):
    return [s['url'] for s in manifest['samples']]+['manifest.json']


def compare_pack(directory, reference=SHIPPED):
    directory, reference = Path(directory), Path(reference)
    manifest = validate_pack(directory)
    return [name for name in pack_names(manifest)
            if not (reference/name).is_file() or digest(directory/name) != digest(reference/name)]


def install_pack(directory, destination=SHIPPED):
    directory, destination = Path(directory), Path(destination)
    manifest = validate_pack(directory)
    destination.mkdir(parents=True, exist_ok=True)
    # Prepare every copy before touching the installed pack. The manifest goes
    # last, and archived comparison WAVs are deliberately retained.
    with tempfile.TemporaryDirectory(prefix='.railroom-audio-install-', dir=destination.parent) as temp:
        copies = Path(temp)
        for name in pack_names(manifest):
            shutil.copyfile(directory/name, copies/name)
        validate_pack(copies)
        for name in pack_names(manifest):
            os.replace(copies/name, destination/name)


def build_pack(directory, source_dir=ROOT/'audio-sources', ffmpeg='ffmpeg'):
    directory, source_dir = Path(directory), Path(source_dir)
    if directory.exists() and any(directory.iterdir()):
        raise ValueError('Staging directory must be empty; existing files will not be overwritten')
    directory.mkdir(parents=True, exist_ok=True)
    for name, *_ in SOURCES.values():
        if not (source_dir/name).is_file():
            raise ValueError(f'Missing original recording: {source_dir/name}')
    audio = load_script('prepare-metallic-audio')
    brakes = load_script('prepare-brake-audio')
    manifest = prepare_bases(directory, source_dir, ffmpeg, audio)
    audio.impacts(manifest, directory)
    audio.rolling(manifest, directory, source_dir, ffmpeg)
    brakes.prepare(manifest, directory, source_dir, ffmpeg)
    (directory/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
    validate_pack(directory)
    # Keep the original impact/bass bases so the derivative CLIs can be rerun
    # against this stage. Only pack_names() files are compared or installed.
    version = subprocess.run([ffmpeg, '-version'], check=True, capture_output=True, text=True).stdout.splitlines()[0]
    report = dict(ffmpeg=version, sources={name: digest(source_dir/name) for name, *_ in SOURCES.values()},
                  assets={name: digest(directory/name) for name in pack_names(manifest)})
    (directory/'build-info.json').write_text(json.dumps(report, indent=2)+'\n')
    return manifest


def main():
    parser = argparse.ArgumentParser(description='Rebuild all twelve current audio assets from preserved OGG originals. Default: stage and validate; never overwrite public/audio implicitly.')
    action = parser.add_mutually_exclusive_group()
    action.add_argument('--output', type=Path, help='New or empty staging directory (default: a new temporary directory)')
    action.add_argument('--check', action='store_true', help='Regenerate temporarily and fail if selected WAVs or manifest differ from public/audio')
    action.add_argument('--install', type=Path, metavar='STAGE', help='Validate and explicitly install a previously staged pack')
    parser.add_argument('--ffmpeg', default='ffmpeg', help='ffmpeg executable (default: PATH)')
    args = parser.parse_args()
    try:
        if args.install:
            install_pack(args.install)
            print('Installed twelve validated recordings and manifest; archived assets preserved.')
        elif args.check:
            with tempfile.TemporaryDirectory(prefix='railroom-audio-check-') as temp:
                build_pack(Path(temp), ffmpeg=args.ffmpeg)
                differences = compare_pack(Path(temp))
                if differences:
                    raise ValueError('Generated pack differs from shipped files: '+', '.join(differences))
                # Exercise the supported incremental CLI workflow against the
                # complete staged pack, including its required original bases.
                for helper in ('prepare-metallic-audio.py', 'prepare-brake-audio.py'):
                    result = subprocess.run([sys.executable, str(Path(__file__).with_name(helper)),
                        '--output', temp, '--ffmpeg', args.ffmpeg], capture_output=True, text=True)
                    if result.returncode:
                        raise ValueError(f'{helper} could not update the staged pack: {result.stderr.strip()}')
                differences = compare_pack(Path(temp))
                if differences:
                    raise ValueError('Derivative updates changed the approved pack: '+', '.join(differences))
            print('All twelve recordings and manifest reproduce byte-for-byte, including derivative CLI updates; shipped files unchanged.')
        else:
            output = args.output or Path(tempfile.mkdtemp(prefix='railroom-audio-'))
            build_pack(output, ffmpeg=args.ffmpeg)
            print(f'Staged twelve validated recordings: {output.resolve()}')
            differences = compare_pack(output)
            print('Differences from shipped pack: '+(', '.join(differences) if differences else 'none (byte-identical)'))
            print(f'Install explicitly with: python3 scripts/prepare-audio.py --install {output.resolve()}')
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        parser.exit(1, f'Audio preparation failed: {error}\n')


if __name__ == '__main__':
    main()
