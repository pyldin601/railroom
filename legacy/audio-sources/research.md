# Redistributable real train audio

Research date: 2026-09-07

All five recordings below are authentic field recordings, not synthesis. The original Wikimedia Commons files are preserved in `originals/`; app-ready PCM WAV derivatives are in `wav/`. Wikimedia API license metadata is preserved as `commons-metadata.json` and `e233-metadata.json`.

## Recommended app assets

| Layer | App-ready WAV | Derivation | Source and license |
|---|---|---|---|
| Dry-ish wheel/rail impacts and joint rhythm | `wav/wheel_rail_impacts_24s_CC0.wav` | 60.0–84.0 s from the original; short fades only | Ural-66, “Knocking wheels of train (recorded in wagon),” [Commons file page](https://commons.wikimedia.org/wiki/File:%D0%A1%D1%82%D1%83%D0%BA_%D0%BA%D0%BE%D0%BB%D1%91%D1%81_%D0%BF%D0%BE%D0%B5%D0%B7%D0%B4%D0%B0.ogg), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| Rolling / rumble bed | `wav/rolling_rumble_midride_40s_PD.wav` | 90.0–130.0 s from a single complete train ride; short fades only | stephan, “Complete Train Ride, 4 minutes,” [Commons file page](https://commons.wikimedia.org/wiki/File:Complete_train_ride_4_minutes.ogg), public domain release |
| Electric traction during acceleration | `wav/e233_acceleration_traction_CC0.wav` | Complete recording; resampled to 48 kHz PCM; short fades only | E217, “E233-3000 acceleration,” [Commons file page](https://commons.wikimedia.org/wiki/File:E233-3000Accelerate.ogg), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| Electric traction / braking during deceleration | `wav/e231_deceleration_traction_braking_CC0.wav` | Complete recording; resampled to 48 kHz PCM; short fades only | E217, “E231 deceleration,” [Commons file page](https://commons.wikimedia.org/wiki/File:E231Deceleration.ogg), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| Mechanical/pneumatic braking event | `wav/railcar_retarder_braking_CC0.wav` | Complete recording; resampled to 48 kHz PCM; short fades only | Ural-66, “Sound during operation of a wagon retarder,” [Commons file page](https://commons.wikimedia.org/wiki/File:%D0%97%D0%B2%D1%83%D0%BA_%D0%BF%D1%80%D0%B8_%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%B5_%D0%B2%D0%B0%D0%B3%D0%BE%D0%BD%D0%BD%D0%BE%D0%B3%D0%BE_%D0%B7%D0%B0%D0%BC%D0%B5%D0%B4%D0%BB%D0%B8%D1%82%D0%B5%D0%BB%D1%8F.ogg), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |

## Technical inventory

All WAV derivatives are signed 16-bit PCM at 48 kHz. The wheel-impact recording is mono; the other four are stereo.

| Original | Duration | SHA-256 |
|---|---:|---|
| `originals/wheel_knocking_in_wagon_CC0.ogg` | 240.666 s | `3319448a22e30ee1ca36a4c5ef98e14e062077b1c985ce166e80ebf6a0df30b5` |
| `originals/complete_train_ride_PD.ogg` | 225.698 s | `f97d0ed990b7024faf5935438fea5e682cd47aed2e765371fb5a618776e0aff3` |
| `originals/e231_deceleration_CC0.ogg` | 32.229 s | `9f462cdcf96b642b2e6b0d09532b78f31a9ddcbe16f3df6e4eb1b2ea0e80021c` |
| `originals/e233_acceleration_CC0.ogg` | 26.593 s | `97a2ef3a34132db4321e62ae4b7c50333b31581e861dd25ddc43da52d18b807f` |
| `originals/railcar_retarder_braking_CC0.ogg` | 10.688 s | `1f566196d0a3955211b5179cade91233ca95036c36fd2c1422d3bcf45d91f86f` |

## Honest quality notes and gaps

- The wheel sample is recorded inside a wagon. It has clear real joint/impact rhythm, but it is not an isolated close-mic axle transient and includes carriage resonance.
- The rolling bed is one excerpt from one authentic ride. It must not be described as a separately recorded speed band. Pitch/rate changes in the simulator are transformations of this source.
- The E233 and E231 recordings provide strong, recognizable electric traction character tied to actual acceleration/deceleration. They are onboard recordings and may include carriage/background noise.
- The retarder recording is a beam wagon retarder with pneumatic-hydraulic drive, likely from a yard/hump context. It is useful as a harsh braking/mechanical layer, but it is not proof of a passenger train's service-brake air release.
- A clean, isolated brake-cylinder vent/hiss and a clean isolated wheel-flange squeal were not found with equally clear permissive licensing in this bounded search. Do not label the retarder sample as either of those.
- No horn, bell, doors, coupling, or compressor-idle layers are included because they were outside the requested core set or lacked enough value for this pass.

## Redistribution

The four CC0 recordings and their derivatives may be copied, modified, and distributed without attribution. The complete ride recording is explicitly released into the public domain on its Commons description page. Keeping the credits above in app documentation is still recommended for provenance. If the WAVs are edited further, document those changes and retain this report plus the API metadata snapshots.
