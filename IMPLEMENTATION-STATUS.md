# Implementation status — 2026-09-07

Implements the approved train simulator plan as a local browser application.

## Delivered

- Deterministic motion with throttle, coast, jerk limits, service/emergency brakes, exact stopping and endpoint handling.
- Audio-clock scheduling of each wheelset/rail crossing; future-event cancellation and pause/seek lifecycle.
- Eleven real field-recording assets with saved originals and provenance, including eight impact variants.
- Per-contact HRTF positioning, one/three carriages, listener seat/yaw, per-wheelset mute/solo and layer controls.
- Original 64 km route preserved; compact derived audio index plus a separate jointed fixture.
- Interactive schematic, station markers/seeking, output meter, diagnostic counters, keyboard controls.
- Twenty-two passing Node tests and a browser offline-audio harness.
- Independent code review found three defects; all were fixed and re-reviewed: pre-audio reset, continuous-layer fade, and control-cutoff event retention.

## Deliberate differences and remaining acceptance work

- Recordings are a mixed-source starter pack. A matched vehicle pack, independent speed-band takes, isolated pneumatic hiss, and carriage impulse responses are not supplied.
- The UI and transport were tested in the Codex in-app browser. A short offline render demonstrated non-silent, finite, unclipped spatial audio and sample-frame event timing. Separate Safari/Chrome sign-off and a 30-minute foreground playback soak remain unperformed.
- No claim of subjective sound-quality approval is made. The included audition mode is ready for the user's listening review.
- Browser remains local; no account, cloud deployment, database migration, or source railway changes.

The planning document's uncompleted listening and soak-test checkboxes remain meaningful acceptance work; this status does not mark them passed.
