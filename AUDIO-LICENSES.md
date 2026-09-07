# Recording credits and processing

Wheel impacts, rolling and braking use field recordings. As requested, powered traction now uses live oscillator/FM synthesis; the synthesized option does not play the original traction clip. The optional smooth recorded mode reuses that clip in overlapping, speed-selected grains rather than looping the entire acceleration sweep. Original compressed recordings and license metadata are preserved in `audio-sources/`.

| Shipped layer | Recording | Creator | Licence |
|---|---|---|---|
| `joint-1.wav` through `joint-8.wav` | [Knocking wheels of train, recorded in wagon](https://commons.wikimedia.org/wiki/File:Стук_колёс_поезда.ogg) | Ural-66 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `rolling.wav` | [Complete train ride, 4 minutes](https://commons.wikimedia.org/wiki/File:Complete_train_ride_4_minutes.ogg) | stephan | Public domain dedication on source page |
| `traction.wav` | [E233-3000 acceleration](https://commons.wikimedia.org/wiki/File:E233-3000Accelerate.ogg) | E217 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `brake.wav` | [E231 deceleration](https://commons.wikimedia.org/wiki/File:E231Deceleration.ogg) | E217 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |

## Derivatives

All app WAVs are mono, 48 kHz, signed 16-bit PCM, peak-normalized to approximately −6 dBFS.

- Impacts: a 60–84 s excerpt from the wheel recording is high-passed at 160 Hz and low-passed at 6.5 kHz. Eight separated high-energy regions are cut to 160 ms, with short attack/release fades. `manifest.json` records the offsets into the original. These are individual excerpt variations, not eight separately recorded wheelsets. Their approximate 10 ms onset marks are used for scheduling; real transient isolation has not been manually calibrated.
- Rolling: original ride 98–108 s, high-pass 40 Hz, low-pass 300 Hz. The filter reduces already-recorded joint detail but does not turn this into a clean studio rolling recording.
- Traction: E233 original 9–13 s, high-pass 150 Hz, low-pass 2.5 kHz.
- Braking: E231 original 10–14 s, high-pass 250 Hz, low-pass 3.5 kHz. This is electric deceleration character, not isolated friction braking or a pneumatic vent.
- Continuous excerpts receive a 150 ms equal-power seam crossfade, shortening the loop by that overlap. Modest playback-rate adjustment changes rolling texture; it does not imply separately recorded reference-speed bands.

The research report also describes a yard retarder sound that was deliberately **not shipped or used** because it would misrepresent passenger train braking. No redistribution attribution is required by these public-domain/CC0 grants, but provenance is retained here.

## Recorded motor tone revision

The current traction manifest points to `traction-tonal.wav`, taken from E233 original 18–19 seconds, high-passed at 160 Hz, low-passed at 1500 Hz, mono 48 kHz PCM and peak-normalized to −6 dBFS. Spectral inspection of the original showed a dominant approximately 273 Hz component and its harmonic at 18 seconds, whereas the previously used region had a less concentrated spectrum. Playback holds a fixed region and changes rate smoothly with simulated speed. Phase alignment accounts for that rate, keeping grain duration at 180 ms in output time. The older `traction.wav` is retained but is not loaded by the current manifest.

## Metallic wheel/rail revision

The manifest now loads `joint-1-metal.wav` through `joint-8-metal.wav` and `rolling-metal.wav`. These derivatives retain the original recording credits and licences above. Original WAVs remain available for comparison; both traction options and the brake recording are unchanged.

Regenerate with `python3 scripts/prepare-metallic-audio.py` (Python standard library and ffmpeg). It reads the preserved original rolling OGG and original impact/bass WAVs, and updates only rolling/impact entries in the existing manifest.

- Rolling restores the original recording's 90–4200 Hz region. Fast peak-following attenuation reduces existing recorded knocks, then broad resonances at 430, 870, 1630 and 2780 Hz add metal texture. This is blended with the previous bass bed. The 150 ms cyclic crossfade is applied after filtering, with a 1 ms boundary-step correction. Duration stays 9.85 seconds.
- Impacts retain each original 160 ms recording and its approximate 10 ms onset. A broad 2.4 kHz band emphasizes the attack. The first 35 ms of the recording excites four damped resonators around 610, 1130, 2070 and 3460 Hz, with decay time constants of 70, 45, 27 and 15 ms and small variation between the eight takes. A quiet ringing tail extends the file to 300 ms, ending in a 20 ms fade. These are modeled resonances excited by recorded sound, not a new Ukrainian field recording.
- All new files are mono 48 kHz signed 16-bit PCM, peak-normalized to approximately −6 dBFS. No added free-running tone or FM source is used in these wheel/rail layers.

The target is the harder metallic character requested by the listener. A specific Ukrainian carriage/track match still requires listening comparison with a reference recording. The rolling bed can still contain some embedded sounds from the original journey.
