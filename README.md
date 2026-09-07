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

The leading axle is the position reference. Other axles are 0, 2.5, 17.5, and 20 m behind each carriage's leading axle; carriages are spaced 26 m apart. At 72 km/h, adjacent axles 2.5 m apart cross the same joint 125 ms apart. Behind-start contacts are suppressed; the train ends when its leading axle reaches 64 km.

Motion advances in 10 ms steps; crossing times are solved inside each step. An audio-clock scheduler prepares a 150 ms horizon and replans future sounds on control changes. A scheduling interruption pauses instead of playing a burst of old sounds.

The original railway remains unchanged. `public/route.json` contains 5,118 weld/joint events and eight stations derived from 245,766 source objects. `npm run build:route` regenerates it when the source dataset exists at the repository's `data/railway/kyiv-fastiv/objects.json` path.

## Recording quality and limitations

This is a functional starter with **recorded rail sounds and continuous synthesized electric traction**. Eight short wheel-impact variants and three continuous layers are included. See [recording credits](AUDIO-LICENSES.md).

The samples come from different trains and recording perspectives. Impacts are short excerpts of an in-wagon recording, rather than dry isolated wheel contacts. One low-pass-filtered ride supplies the rolling bed. A live motor model layers body tone, gear harmonics and restrained FM. Pitch follows speed and load follows throttle, so acceleration no longer repeats a recorded clip. Electric deceleration recordings still provide braking character. A consistent vehicle sound pack, independently recorded speed bands, isolated pneumatic brake hiss, and a measured carriage impulse response remain future audio-production work. Naturalness and headphone front/back separation need listener audition; they are not guaranteed by numerical tests.

The route and component positions are synthetic. This is not an engineering or train-operation simulator. No grades, switches, route geometry, real timetable, or exterior Doppler model is included. Binaural output is stereo, not discrete 5.1/7.1. Browser background and screen-lock playback is not guaranteed.

## Verification

Run `npm test` for numerical and lifecycle tests. Open `/tests/audio-harness.html` on the same local server for actual browser offline-audio checks: asset decoding, bounded voices, finite unclipped output, stereo differences, exact event timing before spatial effects, and source reclamation.

At implementation handoff: 26 Node tests pass. The in-app browser's offline render decoded all 11 samples, rendered non-silent stereo with a measured peak of 0.40376, preserved exact test event frames at 1.06/1.16 seconds, and reclaimed finished impact sources. A follow-up offline test confirmed the continuous layer remains connected during its 30 ms stop fade and reaches silence without an abrupt cut. Interactive playback and reset-after-seek were checked in that browser.

A 30-minute real-time foreground soak, separate Safari/Chrome compatibility sign-off, and subjective listening approval have not been completed. Passing an accelerated simulation or a short offline render is not a substitute for those checks.

## Files

- `src/simulation/`: motion and crossing calculations.
- `src/audio/`: scheduler, recorded sample loading, spatial mixing, continuous layers.
- `src/route/`: compact route index and separate jointed fixture.
- `src/ui/`: track schematic.
- `audio-sources/`: unmodified originals and saved provenance.
- `public/audio/`: derived WAVs and manifest.
- `scripts/prepare-audio.py`: sample-extraction step. Its filtered temporary inputs are described in the recording credits; shipping WAVs require no regeneration to play.
