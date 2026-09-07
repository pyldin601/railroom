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

## Rail impact and resonance revision

Current impacts are `joint-1-rail.wav` through `joint-8-rail.wav`; the earlier `-metal.wav` assets remain preserved. Source recording, source offsets, licences and approximate 10 ms contact onset are unchanged. The 2.9 kHz attack band is emphasized, and the recorded carriage body is shortened. Eight inharmonic resonances (390–4187 Hz, 35–145 ms decay constants) are excited by the first 40 ms of recorded contact, with quiet early returns at 7.3, 13.1, 22.7 and 37.9 ms. The full file is 650 ms including a 40 ms final fade, peak-normalized to −6 dBFS.

This is a modeled rail response, not a measured rail impulse response. The contact and its decay share the existing wheelset emitter and carriage isolation; propagation along a spatially extended rail is not simulated. No room-reverb effect is added. Regeneration uses `scripts/prepare-metallic-audio.py`. Rolling and motor assets are unchanged by this revision.

## Rolling rail resonance

The current rolling asset is `rolling-rail.wav`; `rolling-metal.wav` remains available. It uses the same eight damped rail modes and early-return delays as the approved impact sound, continuously excited by the existing recorded rolling texture. A one-second cyclic preroll settles resonators before processing the usable region. The resonant component is energy-matched at 45% of the pre-bass dry texture's RMS, then blended before the existing cyclic crossfade and bass mix. This ratio is a sound-design parameter, not a measured carriage response.

The loop retains its 9.85 s duration, 48 kHz mono format, −6 dBFS peak and seam correction. Original provenance and licence remain unchanged. The shared mode definition produces byte-identical impact WAVs, preserving the approved wheel impact sound. Regenerate both derivatives with `python3 scripts/prepare-metallic-audio.py`.

## Broader rolling texture

The manifest now selects `rolling-rough.wav`. The rolling-only resonance mix retains the same centre frequencies but adds broad Q=2.5 bands excited by the recorded friction texture (65% energy-matched RMS relative to the pre-bass dry texture). The narrow resonance component is reduced from 45% to 16% RMS, and an additional 0.25 gain of the unresonated normalized recording restores irregular broadband detail. No generated white-noise source is added. Impact processing is unchanged. Previous rolling variants remain available; duration, crossfade, mono format and peak normalization are retained.

## Stronger metallic rolling mix

The current asset is `rolling-steel.wav`, preserving earlier variants. Broad recorded metal bands rise from 65% to 105% energy-matched RMS relative to the pre-bass dry texture; narrow rail resonance rises modestly from 16% to 24%. Unresonated friction increases from 0.25 to 0.35 gain, and the bass/texture blend changes from 0.48/0.72 to 0.38/0.85 before peak normalization. This brings steel texture forward while retaining the broad noisy character. Source, licence, loop duration and processing safeguards are unchanged; impacts and motor sounds are unchanged.

## Further metallic emphasis

The selected asset is now `rolling-steel-rich.wav`. Broad metal-band RMS matching increases from 105% to 145%, narrow resonance from 24% to 32%, and the bass/texture blend moves from 0.38/0.85 to 0.30/0.95 before peak normalization. The unresonated friction component remains at 0.35 gain. Earlier variants and all impact/motor assets are preserved.

## Narrow resonance overlay

The selected rolling asset is `rolling-steel-ring.wav`. Narrow rail-mode RMS matching increases from 32% to 60%, layered over the unchanged 145% broad-band component, 0.35 friction gain and 0.30/0.95 bass/texture mix. Final peak normalization remains −6 dBFS. This restores a more prominent pitched metallic ring without removing the underlying broad texture. Earlier variants and impact/motor assets remain preserved.

## Rolling high-pass

The selected asset is `rolling-steel-highpass.wav`. A fourth-order Butterworth high-pass at 120 Hz (24 dB/octave) processes the complete rolling mix, including its bass bed, before seam correction and final normalization. Cyclic preroll avoids filter-startup transients. Measured filter gain: −38.17 dB at 40 Hz, −3.01 dB at 120 Hz, approximately 0 dB at 1 kHz. Earlier variants remain preserved. Impacts, traction and brakes are unaffected.

## Longer impact decay

Current impacts are `joint-1-rail-long.wav` through `joint-8-rail-long.wav`, lasting 750 ms instead of 650 ms. Impact-only resonator decay constants increase by 71/61 to extend the decay after the 40 ms excitation interval; frequencies, recorded onset and early-return delays are retained. The final fade remains 40 ms. The previous impact files are preserved and rolling resonance is unchanged.

## Restored narrow rolling version

At the listener's request, the manifest again selects the original `rolling-rail.wav`, from before the broad/noisy revisions. Regeneration matches that preserved WAV byte-for-byte. This restores its 45% narrow resonance mix and original bass blend, including the original filtering rather than the later final 120 Hz high-pass. The 750 ms impact revision remains active.

## Softer reverberant impact release

Current impacts are `joint-1-rail-reverb.wav` through `joint-8-rail-reverb.wav`. Duration increases from 750 ms to 1000 ms, with a 150 ms baked-in final fade instead of 40 ms. Impact-only resonance decay scaling increases from 71/61 to 96/61. Quiet additional returns at 61, 89 and 127 ms create a slightly more diffuse metallic tail. Recorded strike onset and resonance frequencies remain unchanged. Runtime's final 25 ms safety fade overlaps the end of the baked-in release. Earlier assets and the approved rolling sound are preserved.

## Split braking tone and friction hiss

The runtime replaces `brake.wav` with two derivatives of the preserved E217 E231 deceleration recording (CC0, original source URL retained in each manifest entry):

- `brake-tone.wav`: original 10–11 s, 180–2200 Hz, mono 48 kHz PCM. A fixed local region is played with 180 ms phase-aligned Hann grains. Playback pitch follows simulated speed, not the recording's full deceleration sweep.
- `brake-hiss.wav`: original 10–14 s, 4000–10000 Hz, mono 48 kHz PCM. Overlapping grains sample different offsets at a fixed playback rate. This is a high-frequency friction/air texture, not a recording of an isolated pneumatic brake valve.

Both are peak-normalized to −6 dBFS. Regenerate using `PYTHONDONTWRITEBYTECODE=1 python3 scripts/prepare-brake-audio.py`. The old recording remains preserved. This is frequency separation and sound design, not clean physical source separation. Pitch continuity and lifecycle checks do not establish subjective authenticity.

The two local bogies each receive a tone and hiss feed. Brake pressure controls amplitude; both fade below 2 m/s and become silent at rest. Releasing the brake stops scheduling new grains and fades existing sources. The existing Braking slider controls both components. The motor modes retain their original parameter defaults and sound assets.
