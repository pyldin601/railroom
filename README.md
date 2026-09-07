# Railroom — train sound simulator

A local browser simulator for the synthetic 64 km Kyiv-Pasazhyrskyi–Fastiv route. Real recorded wheel samples are triggered separately for every wheelset and rail side, with onboard headphone spatialization.

## Run

From this directory, run `npm start`, then open <http://127.0.0.1:8765/>. No package installation is required. Node.js runs tests; Python 3 serves the static files. Keep the server running while using the app.

- **Start journey:** accelerates using the throttle slider. Braking takes priority over traction.
- **Audition at 72 km/h:** switches to the separate 25 m jointed track, starts at 72 km/h, and coasts. Useful for hearing the wheelset rhythm immediately.
- **Coast / service brake / emergency brake:** change the motion and continuous sound layers.
- **Pause / resume:** preserves position and speed; future impacts are cancelled.
- **Jump to station:** stops at the selected approximate marker; press Start/Resume to move again.
- **Carriages:** one or three, with four wheelsets per carriage. Axle labels show carriage number and axle number. Click to mute; S to solo.
- **Seat / Look around:** changes the onboard listening perspective. Headphones are recommended. Turning binaural off uses basic equal-power spatial panning.
- **Keyboard:** Space pauses/resumes, Up/Down changes throttle, B increases service brake. Native form controls retain their own keyboard behaviour while focused.

## What is modelled

The leading axle is the position reference. Other axles are 0, 2.4, 19, and 21.4 m behind each carriage's leading axle; carriages are spaced 26.696 m apart. At 72 km/h, adjacent axles 2.4 m apart cross the same joint 120 ms apart. Behind-start contacts are suppressed; the train ends when its leading axle reaches 64 km.

Motion advances in 10 ms steps; crossing times are solved inside each step. An audio-clock scheduler prepares a 150 ms horizon and replans future sounds on control changes. A scheduling interruption pauses instead of playing a burst of old sounds.

The original railway inventory remains unchanged. `public/route.json` is a separate mixed-track variant, with 5,118 weld/joint events, eight source station markers, and explicit rail spans and construction sections. `npm run build:route` deterministically regenerates it using `data/railway/kyiv-fastiv/objects.json`. Connection UUIDs and positions are retained; their types follow the new layout. See [TRACK-LAYOUT.md](TRACK-LAYOUT.md) for the section plan and assumptions.

## Recording quality and limitations

This is a functional starter with **recorded rail sounds and continuous synthesized electric traction**. Eight short wheel-impact variants and three continuous layers are included. See [recording credits](AUDIO-LICENSES.md).

The samples come from different trains and recording perspectives. Impacts are short excerpts of an in-wagon recording, rather than dry isolated wheel contacts. One low-pass-filtered ride supplies the rolling bed. A live motor model layers body tone, gear harmonics and restrained FM. Pitch follows speed and load follows throttle, so acceleration no longer repeats a recorded clip. Electric deceleration recordings still provide braking character. A consistent vehicle sound pack, independently recorded speed bands, isolated pneumatic brake hiss, and a measured carriage impulse response remain future audio-production work. Naturalness and headphone front/back separation need listener audition; they are not guaranteed by numerical tests.

The route and component positions are synthetic. This is not an engineering or train-operation simulator. No grades, switches, route geometry, real timetable, or exterior Doppler model is included. Binaural output is stereo, not discrete 5.1/7.1. Browser background and screen-lock playback is not guaranteed.

## Verification

Run `npm test` for numerical and lifecycle tests. Open `/tests/audio-harness.html` on the same local server for actual browser offline-audio checks: asset decoding, bounded voices, finite unclipped output, stereo differences, exact event timing before spatial effects, and source reclamation.

At implementation handoff: 32 Node tests pass. The in-app browser's offline render decoded all 11 samples, rendered non-silent stereo with a measured peak of 0.40376, preserved exact test event frames at 1.06/1.16 seconds, and reclaimed finished impact sources. A follow-up offline test confirmed the continuous layer remains connected during its 30 ms stop fade and reaches silence without an abrupt cut. Interactive playback and reset-after-seek were checked in that browser.

A 30-minute real-time foreground soak, separate Safari/Chrome compatibility sign-off, and subjective listening approval have not been completed. Passing an accelerated simulation or a short offline render is not a substitute for those checks.

## Files

- `src/simulation/`: motion and crossing calculations.
- `src/audio/`: scheduler, recorded sample loading, spatial mixing, continuous layers.
- `src/route/`: compact route index and separate jointed fixture.
- `src/ui/`: track schematic.
- `audio-sources/`: unmodified originals and saved provenance.
- `public/audio/`: derived WAVs and manifest.
- `scripts/prepare-audio.py`: sample-extraction step. Its filtered temporary inputs are described in the recording credits; shipping WAVs require no regeneration to play.

## Motor comparison

The approved synthesized motor was preserved in commit `3c96ddc`. The Motor sound selector also offers **Recorded · motor tone**. This uses 180 ms overlapping Hann-windowed grains from a fixed, motor-dominated region of the original recording, with local waveform alignment. Pitch follows simulated speed through smoothed playback-rate control. At steady speed both region and pitch stay fixed: the full acceleration sweep is never repeatedly restarted. This is a time-stretched texture from one recording, not a newly recorded steady-speed engine. Some granular coloration can remain. Switching modes fades the old motor and keeps the journey running.

## Metallic wheel/rail character

The default rolling and joint assets now use the metallic derivatives described in [AUDIO-LICENSES.md](AUDIO-LICENSES.md): restored rolling midrange, sharper recorded contact attacks, and short damped metal tails. Per-wheelset spatial positioning, joint timing, the quiet weld level, and both motor options are preserved. Regenerate with `python3 scripts/prepare-metallic-audio.py`; the older WAVs are retained.

Verification after this revision: 37 Node tests pass, including rolling spectral change, loop continuity, and bounded impact tails. The browser offline render passes asset decoding, timing, spatial channels, fades and source cleanup; three-carriage peak is 0.37970. These checks establish audio integrity, not subjective authenticity.

## Ten-carriage consist

The consist selector offers one or ten carriages, defaulting to ten. In the ten-carriage train the listener is in carriage five: Front/Middle/Rear correspond to 108.784/117.484/126.184 m behind the leading axle. Switching to one carriage maps those same seat controls back to carriage one. All forty wheelsets retain independent spatial contacts and mute/solo controls. The schematic fits the entire consist.

Verification: 38 Node tests pass. A ten-carriage browser offline render with the listener in carriage five passes timing, stereo, voice cleanup, and clipping checks (peak 0.39131).

## Interior carriage isolation

Ten carriages remain visible, but only carriages 3–7 produce sound around the listener in carriage 5. Relative bus gains are 5%, 30%, 100%, 30%, 5%; all farther carriages are silent and create no impact, rolling, or motor sources. HRTF direction remains active; outdoor inverse-distance attenuation is disabled so it does not multiply these interior transmission levels. Mute/solo retains the isolation gains. Braking is emitted locally in the occupied carriage. These percentages are amplitude gains, not calibrated perceived-loudness percentages.

Verification: 39 Node tests pass. Browser checks confirm 20 rolling sources, ten motor voices, no distant impact sources, preserved timing and stereo, clean fades and no clipping (peak 0.42179).

Current coach geometry: [КВБЗ 61-779 with ТВЗ-ЦНИИ-М bogies](COACH-GEOMETRY.md). This supersedes earlier generic geometry and timing figures in the historical verification notes.

## Rolling at individual wheels

Rolling now uses eight independent mono sources at the occupied carriage's four left and four right wheels. Each uses the approved narrow recording with a distinct loop offset and a slight fixed playback-rate variation (within ±1%). They follow their corresponding wheelset's spatial emitter and mute/solo controls. Rolling sources are not created for other carriages; neighbouring impact and motor isolation remains unchanged. A √2 gain correction compensates for replacing each central axle source with two wheel sources. These are independent playbacks of one recording, not eight independently recorded wheels.

## UI rendering cost

The dashboard no longer runs an unconditional animation-frame loop. It redraws on control/status changes and resize while paused, stops visual work when hidden, and schedules active animation at no more than 30 fps. Repeated text writes are skipped when values are unchanged. The separate 25 ms audio scheduling interval is retained. Browser start/pause checks passed; an OS-level CPU before/after benchmark has not been recorded.

## Louder default mix

Master volume defaults to 100%. A fixed 1.4× mix gain (+2.92 dB) sits before the existing compressor, raising all layers together while preserving their relative controls. The master slider still scales from silence to full volume. Combined with the previous 55% master default, this raises pre-compressor gain by approximately 8.12 dB at startup; perceived loudness depends on compressor activity and source content.

## Braking without repeated deceleration sweeps

Braking now combines a held, speed-pitched recorded tone with an independently scattered, unpitched friction-hiss texture. The same overlapping-grain engine used by recorded traction supplies smooth envelopes. Both components follow brake pressure, fade near rest, and are located at the occupied carriage's bogies. No full deceleration clip is looped. See [recording notes](AUDIO-LICENSES.md) for sources and limitations.

Rolling playback pitch is fixed: speed affects rolling volume, not pitch. Each wheel keeps its small, constant rate variation (within ±1%) and separate source offset. Motor and brake tone speed behaviour is unchanged.

The eight rolling wheels now use fixed, irregular detuning of −17, +7, +15, −8, +11, −14, −4 and +10 cents. Their average in cents is zero, preserving the overall pitch centre while broadening the combined resonance. This is a sound-design variation, not measured wheel-specific tuning. Pitches remain constant with speed and across restarts.

Each wheel's rolling playback is split at 500 Hz into low rumble and high metal layers, with independent 0–150% controls. Both default to 100%; the existing Rolling control scales their combined level. A fourth-order Linkwitz–Riley crossover keeps the combined frequency response flat at equal levels. Both bands share the same playback, offset, fixed pitch and spatial emitter, so they stay synchronized. Browser frequency-response checks verify the crossover and the full mix renders without clipping at default levels; all 54 Node tests pass.

Carriage ambience adds a quiet generated stereo bed of filtered ventilation noise and muted body hum, with no voices. Its separate slider defaults to 10%. It remains audible at rest during a running journey and fades out on pause. The 18.5-second texture has a half-second loop crossfade and is cached per audio context; it is a designed texture, not a field recording.

The synthesized motor adds a Taurus 1016/1116-inspired fourteen-note Dorian sequence. D4 tuning and an approximate 0–20 km/h speed map are sound-design choices, not measured Siemens settings. Two alternating oscillators crossfade held notes; the sequence descends with speed during electrical braking, fades near rest when braking, and recedes above 20 km/h. The original synthesized motor remains underneath. Traction defaults to 30%; rolling gain is doubled before the output compressor, with source WAVs preserved. This is twice the amplitude (+6 dB before compression), not a guarantee of twice the perceived loudness.

The added PWM sequence is mixed at one-third of its initial level (−9.54 dB), independently of the underlying synthesized motor.

Synthesized traction and PWM share a locomotive transmission bus ahead of the train, with a 2.2 kHz low-pass and three quiet reflections at 23/41/67 ms. The direct HRTF source stays at the locomotive; reflection directions surround the forward part of the listener’s carriage and respond to head rotation. This is an artistic interior transmission model, not a measured carriage impulse response. Wheel mute/solo controls do not mute the locomotive.

Speed and Boiarka electrical markers are documented in [OPERATING-MARKERS.md](OPERATING-MARKERS.md). All numeric limits and positions are explicitly estimated; no current official route profile was verified.

Boiarka power-off/on markers now trigger spatial contactor clunks. Traction is disabled inside the neutral zone, overriding positive acceleration smoothing; rolling resistance and brakes remain active. Motor/PWM audio is muted while unpowered, and the selected throttle resumes after power-on. Speed limits remain unenforced estimates.

The route overview shows station bubbles with hover/focus labels, estimated speed bands, and separate power-off/on markers. Labels include route distance and uncertainty; speed bands are informational and do not enforce limits.

Autopilot starts/resumes the journey, follows the scenario speed markers with a small cruising margin, anticipates slower zones, and stops at every remaining passenger stop for 60 simulation seconds. Pausing freezes the dwell timer. It targets gentle acceleration (0.28 m/s²) and caps service braking at 40% (0.32 m/s²); no emergency brake is commanded. The final platform approach is a slow crawl. Existing neutral sections override traction. Limits remain estimates; this is a relaxation controller, not an operational train protection model. Enabling it while already overspeed or too close to a stop cannot guarantee a comfortable recovery.

Clicking/touching either driving slider, changing it with the keyboard, Coast, Emergency, or the throttle/brake shortcuts disengages Autopilot. Reset, seek, route/consist changes and audition also disengage it. Manual operation does not enforce speed markers. The Autopilot button and a next-stop/dwell countdown show its state. The starting station is treated as the departure point; remaining stations receive one-minute dwells, and the train stays stopped at the terminus.

Pneumatic brakes use a simplified equivalent cylinder and reservoir state on simulation time. Cylinders fill up to 4 bar at 2.5 bar/s and vent with a 1.4-second exponential pressure decay (about 95% released after 4.2 seconds); reservoir pressure falls as cylinders fill. A compressor starts below 7.2 bar and stops at 9 bar, and cannot recharge in a power-off zone. These are sound-design parameters, not a detailed brake-pipe/distributor model or verified vehicle specifications. Service braking follows cylinder pressure; emergency braking retains the immediate emergency override. Traction waits for residual cylinder pressure to clear.

Falling cylinder pressure drives a local air-release hiss even at rest. Holding brakes produces no release hiss. The compressor has a quiet mechanical hum routed through the locomotive spatial bus. Both textures are generated, controlled by the Braking mix slider and faded on pause. Pause preserves pressures; reset/seek initializes a charged reservoir. The drive panel displays cylinder and reservoir pressure and compressor state. Autopilot holds pressure during the dwell, then exhausts before moving off; full-route tests cover the pneumatic response.

Brake-release hiss follows the declining exhaust flow with 120 ms gain smoothing, producing a fading tail instead of a constant hiss followed by a cutoff. Negligible residual pressure below 0.005 bar is cleared to zero.

Wheel impacts now use all carriages, with separate direct and structural sound paths per wheel. Direct gain is 0.3^travel / (1 + wheelDistance/18); structural gain is 0.62^travel / sqrt(1 + wheelDistance/35). Here travel = max(0, longitudinal wheel-to-seat distance − 10.7) / 26.696, and wheelDistance includes lateral and vertical separation in meters. Both curves vary continuously with physical distance. External wheels receive an additional cabin isolation multiplier of up to 0.6 for direct impacts and 0.9 for metal hiss, reduced near carriage ends so the nearest external wheel stays below 90% of the quietest occupied-carriage wheel; there are no further steps between external carriages. This keeps the occupied carriage louder at all three seat presets. Seat changes update both paths smoothly. Existing rolling and motor isolation are unchanged. Each impact adds the same clack recording through a 4 kHz high-pass filter and 500 ms reverb decay (35% wet addition), cached once per recording, controlled by “Impact · metal hiss” and the overall Wheel impacts slider. This is an artistic approximation of structure-borne sound, not measured rail propagation. The impact budget is 512 groups, with two synchronized sample sources per group; the metal tail finishes independently and both sources stop on cancellation.

Rolling wheel levels use the same distance attenuation curve as the metal impact layer, without its 35% effect gain. Only the eight occupied-carriage wheels produce rolling audio. Seat changes update each wheel’s gain with 120 ms smoothing; the low and high bands share this gain.

Internal welds in welded strings are silent: they remain in the track data but schedule no impact or metal hiss voices. Mechanical joints between strings still produce normal wheel impacts.

Horn button (H) plays a designed two-tone pneumatic horn through the locomotive spatial bus, including when stopped. Autopilot sounds one horn and holds for 1.4 seconds before the initial stationary departure and after each 60-second intermediate dwell; no departure horn at the terminus or when enabling autopilot while moving.

Horn ambience: 2.4-second reverb decay with 65% dry and 70% wet gains and 2.8 seconds of tail space; eight reflection delays, four diffusion stages and a 1.8 kHz low-pass soften the ambience, through the existing filtered locomotive spatial bus. Horn gain follows 1 / (1 + locomotive-to-seat distance / 28): about 17.6% (−15.1 dB) at the default carriage-5 seat, before the existing locomotive bus attenuation.

Metal impact hiss now has 70% base gain (2× its previous 35%) and uses one quarter of the distance in its attenuation curve for 4× reach. The local-carriage dominance safeguard remains. Direct impacts and rolling retain their existing attenuation and levels.

Metal hiss fades smoothly toward both train ends over three carriage lengths, from full transmission inside the train to 0.1× (−20 dB) at the outermost wheels. The multiplier uses each wheel’s position rather than carriage-number steps; the occupied carriage remains unaffected.
