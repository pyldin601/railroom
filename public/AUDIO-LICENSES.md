# Recording credits and processing

The active manifest is `public/audio/manifest.json`. It records the source URL,
creator, licence, original offset, and processing description for every recorded
layer. Original OGG recordings and source metadata are preserved in `audio-sources/`.
The sound pack combines different trains; it is not a recording of the Kyiv–Fastiv
service or a measured Ukrainian vehicle sound model.

| Current assets                                              | Original recording                                                                                           | Creator | Licence                                 |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------- | --------------------------------------- |
| `joint-1-rail-reverb.wav` through `joint-8-rail-reverb.wav` | [Knocking wheels of train, recorded in wagon](https://commons.wikimedia.org/wiki/File:Стук_колёс_поезда.ogg) | Ural-66 | CC0-1.0                                 |
| `rolling-rail.wav`                                          | [Complete train ride, 4 minutes](https://commons.wikimedia.org/wiki/File:Complete_train_ride_4_minutes.ogg)  | stephan | Public domain dedication on source page |
| `traction-tonal.wav`                                        | [E233-3000 acceleration](https://commons.wikimedia.org/wiki/File:E233-3000Accelerate.ogg)                    | E217    | CC0-1.0                                 |
| `brake-tone.wav`, `brake-hiss.wav`                          | [E231 deceleration](https://commons.wikimedia.org/wiki/File:E231Deceleration.ogg)                            | E217    | CC0-1.0                                 |

[CC0 terms](https://creativecommons.org/publicdomain/zero/1.0/). Provenance is
retained even where attribution is not required. The yard retarder mentioned in
historical research was not shipped or used.

## Current recorded derivatives

All twelve active WAVs are mono, 48 kHz, signed 16-bit PCM, peak-normalized to
approximately −6 dBFS. Older base WAVs are retained for provenance and processing;
they are not all loaded for playback.

- **Impacts:** eight distinct 160 ms excerpts from original seconds 60–84, with
  a 160 Hz high-pass and 6.5 kHz low-pass. The current derivative sharpens the
  2.9 kHz attack, shortens the carriage thump, and adds eight recording-excited
  rail modes and quiet early returns. Each buffer lasts one second, with an
  approximate 10 ms contact onset and 150 ms final fade. These are alternative
  excerpts of one in-wagon recording, not dry separately recorded wheels.
- **Rolling:** original seconds 98–108. A filtered bass bed is blended with a
  transient-controlled 90–4200 Hz metallic texture and recording-excited rail
  resonance. The cyclic crossfade produces a 9.85 s loop. Eight independent
  playbacks use fixed, irregular detuning and phase offsets. Speed changes
  amplitude, not pitch; no independent recorded speed bands are supplied.
- **Recorded traction:** original seconds 18–19, high-pass 160 Hz and low-pass
  1500 Hz. The current one-second tonal asset is played through overlapping,
  phase-aligned grains with speed-controlled pitch. It does not replay a complete
  acceleration sweep. The original `traction.wav` is retained but inactive.
- **Braking:** the held tone uses one second from original second 10, filtered
  180–2200 Hz. Friction hiss uses four seconds from the same offset, filtered
  4–10 kHz. Separate granular layers vary tone pitch with speed while leaving the
  hiss unpitched. The hiss is not an isolated recorded pneumatic vent.

Exact extraction, intermediate PCM, filtering, fades, and normalization are
implemented by the preparation scripts. Historical processing revisions are
preserved in [audio processing history](docs/audio-processing-history.md).

## Runtime processing and synthesis

The metal impact branch processes the same recorded clack through a 4 kHz
high-pass and 500 ms RT60 reverb with a 35% wet addition. It is rendered once per
recording and cached. Its base amplitude is 0.7; its extended distance curve and
smooth end attenuation are artistic transmission models. When the voice budget
fills, completed external direct clacks may have their remaining metal tail faded
out early; occupied-carriage tails and future direct strikes remain protected.

Rolling splits at 500 Hz into complementary fourth-order low/high layers. Both
bands share each wheel's distance gain and fixed playback pitch.

The default traction motor and Taurus-inspired PWM sequence are synthesized;
the notes and thresholds are designed, not verified Siemens measurements. The
horn is a synthesized two-tone pneumatic design with a 2.4 s reverb decay. Air
release, compressor hum, power switches, and quiet speech-free cabin ambience
are also generated. The locomotive bus uses filtering and reflections to create
an interior perspective, not a measured carriage impulse response.

## Regeneration

Requirements: Python 3 and ffmpeg on `PATH`. No Python packages or temporary
recordings are prerequisites.

```sh
npm run build:audio
npm run check:audio
python3 scripts/prepare-audio.py --install /path/to/validated/stage
```

The build command stages the complete current pack from checked-in originals and
validates it before reporting the staging location. The check command regenerates
and compares with the shipped active assets and manifest, then reruns both
derivative updaters and verifies that the result remains identical. Staging keeps
the nine base WAVs required by those updaters; installation excludes those bases. Installation validates
an explicit stage before updating the active files. Routine playback requires no
regeneration. The narrower metallic/brake scripts accept explicit output locations;
use the complete pipeline when rebuilding a pack from scratch.
