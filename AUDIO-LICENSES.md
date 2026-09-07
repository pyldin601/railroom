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
