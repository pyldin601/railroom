# Railroom

A local browser train-sound simulator for relaxed listening on an illustrative
64 km Kyiv-Pasazhyrskyi–Fastiv route. Recorded wheel contacts and rolling blend
with synthesized traction, horn, and carriage ambience. Headphones are recommended.

## Run

```sh
npm start
```

Open http://127.0.0.1:8765/ and keep the server running. The app uses native
JavaScript modules and Web Audio: no application build step or npm dependencies.
Python 3 serves files; Node.js 22 or newer runs the verification commands.

## Controls

- **Start / pause:** preserves speed and position on pause, fades continuous audio,
  and cancels future contacts. Reset rewinds and stops; station seeking stops at the
  selected marker.
- **Throttle, service brake, coast, emergency brake:** drive manually. Braking
  includes rolling and aerodynamic resistance. Vehicle maximum is 360 km/h;
  manual driving does not enforce route speed markers.
- **Autopilot:** follows estimated limits, stops at every remaining passenger stop,
  and dwells for 60 simulation seconds. A departure horn precedes initial and
  intermediate departures. Pause freezes dwell time. Driving controls, reset,
  seeking, route/consist changes, and audition disengage it.
- **Carriages:** one or ten; the default seat is in carriage five of ten. Front,
  Middle, Rear, and Look around adjust the listening position.
- **Wheel audition:** click an individual wheel to hear its spatial impact. It
  works while stopped, using a 72 km/h audition level. There are no wheel mute/solo
  controls.
- **Track demos:** choose 25 m or 12.5 m jointed track in the route selector.
  **Audition at 72 km/h** coasts on the selected demo; from the Kyiv route it
  switches to the 25 m demo.
- **Sound layers:** adjust impacts, metal tails, rolling and its two frequency
  bands, traction, braking, and cabin ambience. The motor selector offers
  synthesized traction or a recorded tonal texture.
- **Shortcuts:** Space pauses/resumes; Up/Down adjust throttle; B applies service
  brake; H sounds the horn. Focused form controls retain native keyboard behavior.

## Sound and route model

All 80 wheels in the default ten-carriage train can generate separate spatial joint
impacts. Continuous distance attenuation keeps the occupied carriage loudest.
Metal tails carry farther than direct clacks and fade smoothly toward both ends
of the train. Under maximum load, finished external clack tails can be retired
with a short fade; occupied-carriage decays and upcoming contacts are protected.

Only the occupied carriage's eight wheels produce rolling. They have independent
loop phases and small, fixed pitch offsets; rolling pitch does not vary with
speed. A 500 Hz crossover exposes separate low/high controls. Motor, braking,
air release, compressor, cabin ambience, and horn have independent lifecycles.
Cabin ambience contains no speech. The horn is synthesized, not an authentic
Siemens recording. See [audio credits and processing](AUDIO-LICENSES.md).

The route has 19 passenger stops, 12 km of 25 m jointed track, 6 km of
12.5 m jointed track, and 46 km of 725–800 m welded strings. Internal fabrication welds are silent; joints between
strings still produce impacts. A Boiarka neutral section cuts traction and triggers
power-switch sounds. Jointed sections are limited to 40 km/h (25 km/h at the
terminal approaches); welded strings permit 120 km/h. Autopilot follows these
limits. Positions and speed limits are illustrative estimates, not
verified operating data. See [track layout](TRACK-LAYOUT.md),
[operating markers](OPERATING-MARKERS.md), and [coach geometry](COACH-GEOMETRY.md).

This is a relaxation simulator. It has no grades or operational railway protection
model; late or overspeed autopilot engagement cannot guarantee comfortable stops.
The recordings come from different trains and perspectives. Subjective authenticity,
headphone front/back separation, and background/screen-lock playback vary.

## Structure

```text
index.html                    Page and accessible controls
src/main.js                   UI actions and startup
src/session.js                DOM-independent transport/audio session
src/simulation/               Motion, pneumatic state, autopilot, crossings
src/route/                    Route index and coach geometry
src/audio/engine.js            Continuous audio lifecycle coordinator
src/audio/rolling.js           Occupied-wheel rolling sources
src/audio/spatial-mixer.js     Spatial buses, impacts, horn, power sounds
src/audio/settings.js          Shared mix defaults and rolling tuning
src/audio/scheduler.js         Audio-clock prediction and event cancellation
src/audio/                    Individual sound layers and DSP helpers
src/ui/                       Dashboard, route map, train canvas, render loop
data/railway/kyiv-fastiv/       Source railway inventory
public/route.json              Generated browser route
audio-sources/                 Original recordings and provenance
public/audio/                 Prepared WAVs and manifest
scripts/                      Route/audio preparation and browser verification
tests/                        Numerical, lifecycle, and browser checks
docs/                         Architecture plan and historical revision notes
```

Simulation advances in 10 ms steps with crossing times solved inside each step.
A 25 ms tick prepares a 150 ms horizon on the audio clock. Motion and autopilot
prediction roll back together when future events are canceled. Rendering is
separate, throttled while running, and invalidated on demand while paused.

## Verification

```sh
npm test                    # Node behavior, DSP and lifecycle tests
npm run test:browser         # Offline audio plus actual page control checks
npm run check               # Both suites
npm run build:route         # Regenerate public/route.json
npm run build:audio          # Build and validate a complete staged sound pack
npm run check:audio          # Regenerate and compare with the shipped pack
```

Browser verification requires an installed Chrome or Chromium. Set `BROWSER_BIN`
to an executable path if it is not in a standard location. The command starts a
loopback-only server and temporary headless profile, reports failures with a
nonzero exit status, and removes the profile afterward. It does not reuse your
browsing profile. The individual [audio harness](tests/audio-harness.html) and
[combined harness](tests/browser-harness.html) can also be opened on the local
server; the combined harness has a Run button.

The browser suite covers decoding, spatial output, timing, fades, source cleanup,
frequency response, maximum-speed load, and start/pause/reset/seek/autopilot/motor/
consist controls. Browser signal tests do not establish subjective sound quality.
A 30-minute real-time soak and separate Safari compatibility sign-off remain
manual acceptance work.

Audio preparation requires ffmpeg and Python's standard library. It builds from
checked-in originals into staging, preserving the current pack until explicit
installation. See [processing commands](AUDIO-LICENSES.md#regeneration).
Historical revision notes live in [development history](docs/development-history.md)
and are not current specifications.
