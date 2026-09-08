# Implementation status

Railroom is a working local browser simulator. Current behavior, structure, and
commands are documented in [README](README.md); source attribution and exact
preparation details are in [audio credits](AUDIO-LICENSES.md).

The review cleanup corrects resistance during braking, preserves pending departure
horns across cancellation, protects local contacts at maximum impact load, repairs
the browser harness, and replaces obsolete user-facing sound descriptions.

The session controller owns transport and graph replacement. The audio engine owns
continuous layers; rolling is a separate wheel-only layer. Shared mix defaults and
vehicle coefficients reduce tuning drift. Audio preparation builds the complete
current pack from saved originals, stages and validates it, and can compare it with
shipped assets before installation.

Run `npm run check` for Node and browser verification, `npm run check:audio` for
recording reproducibility, and `npm run build:route` to regenerate the route.
These are independent checks: no historical result should be treated as a fresh run.

Remaining manual acceptance work: a 30-minute real-time foreground soak, separate
Safari compatibility sign-off, and subjective listening after changes. Short
numerical/offline renders do not establish subjective authenticity or guarantee
background/screen-lock playback. No operational railway safety claims are made.

Earlier implementation counts and sound revisions remain in
[historical notes](docs/development-history.md).
