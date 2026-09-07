"""Extract held brake tone and unpitched friction hiss from the saved recording."""
import argparse
import importlib.util
import json
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('metallic_audio', Path(__file__).with_name('prepare-metallic-audio.py'))
audio = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(audio)


def prepare(manifest, directory, source_dir=audio.APP/'audio-sources', ffmpeg='ffmpeg'):
    original = next(s for s in manifest['samples'] if s['kind'] in ('brake', 'brake-tone'))
    base = {k: original[k] for k in ('source', 'license', 'author')}
    manifest['samples'] = [s for s in manifest['samples'] if s['kind'] not in ('brake', 'brake-tone', 'brake-hiss')]
    for kind, duration, filters, description in [
        ('brake-tone', 1, 'highpass=f=180,lowpass=f=2200', 'Fixed local brake-tone texture; pitch follows simulated speed using phase-aligned grains, not a deceleration loop.'),
        ('brake-hiss', 4, 'highpass=f=4000,lowpass=f=10000', 'High-frequency friction/air texture from the same train recording; unpitched scattered grains. Not an isolated pneumatic vent recording.'),
    ]:
        data = audio.decode('e231_deceleration_CC0.ogg', 10, duration, filters, source_dir, ffmpeg)
        audio.write(kind+'.wav', data, directory)
        manifest['samples'].append(dict(id=kind, kind=kind, url=kind+'.wav', gain=1, onset=0,
                                       sourceOffsetSeconds=10, description=description, **base))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Update brake derivatives in an explicit staging directory. For a complete pack use prepare-audio.py.')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--ffmpeg', default='ffmpeg')
    args = parser.parse_args()
    if args.output.resolve() == audio.OUT.resolve():
        parser.error('Use a staging directory; install a verified pack through prepare-audio.py --install.')
    path = args.output/'manifest.json'
    manifest = json.loads(path.read_text())
    prepare(manifest, args.output, ffmpeg=args.ffmpeg)
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
