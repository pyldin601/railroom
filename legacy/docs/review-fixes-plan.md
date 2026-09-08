# Review fixes — implementation plan

The approved design is the project review followed by “fix all findings”.
Keep the static native-module app, recorded assets, tuned gains, route, and controls.
Work in this standalone repository. Commit and push only when requested; the user
authorized publication after verification. Leave `.idea/` alone.

- [x] Simulation: regression tests for brake versus coast and canceled departure
  horns; add resistance to braking, synchronize controller prediction rollback,
  and share vehicle coefficients with the autopilot.
- [x] Audio: reproduce maximum-speed saturation, retain local impacts through
  bounded voice prioritization, fix the browser fade fixture, and add load coverage.
- [x] Assets: generate the entire current pack from checked-in originals into a
  staging directory, validate it, and provide check/install commands without
  silently changing the approved recordings.
- [x] Structure: format maintained source, extract a DOM-independent session
  controller, separate continuous audio orchestration from rolling, and name
  related tuning values without changing their values.
- [x] Verification: make browser checks runnable through a local command; cover
  real start/pause/reset/seek/autopilot controls as well as offline audio.
- [x] Documentation: replace stale current-state descriptions, retain historical
  development notes as history, and update the handoff with the new structure.
- [x] Final: run Node, browser, route, and audio-generation verification; review
  the integrated changes and report measured outcomes and remaining limitations.

Independent ownership: simulation reviewer owns simulation/scheduler and their
tests; audio reviewer owns mixer/voice tests/harness; asset reviewer owns audio
preparation scripts. Main agent owns UI/session/audio-engine extraction, tooling,
documentation, and integration. Shared file changes are coordinated before edits.

## Verification and review outcome

- `npm run check`: 105 Node tests plus the complete browser audio/control suite pass.
- Maximum-speed native render: 1,318 contacts, zero drops, 512 groups, peak 0.70593.
- `npm run check:audio`: all twelve WAVs and manifest match byte for byte, including
  full build → metallic updater → brake updater round trips.
- `npm run build:route`: unchanged 5,118 contacts, 628 spans, 19 stations.
- Formatting and diff whitespace checks pass. Browser runner signal-exit cleanup
  was verified with a disposable process.
- Independent review confirmed motion/controller rollback and continuous-audio
  extraction. Its loading-options, runner-shutdown, render-wait, and staging-base
  findings were fixed and reverified.
- Source audio and route data remain unchanged. Commit/push was subsequently
  requested by the user. Long real-time listening and Safari acceptance remain
  outside these automated checks.
