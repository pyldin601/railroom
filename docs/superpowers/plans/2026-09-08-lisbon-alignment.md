# Kyiv–Lisbon simplified corridor update

The user replaced the real-alignment rebuild with simplified distances and speed
limits on 2026-09-08. The final scope uses 21 stops, rounded research-informed leg
distances, hand-authored representative running zones and existing local speed
restrictions. Maximum simulation speed stays 260 km/h. Kyiv–Fastiv stays default.

- [x] Research main passenger corridors and round leg distances.
- [x] Store a compact editable corridor definition with clearly synthetic speeds.
- [x] Update deterministic generator, station positions, caption and tooltip wording.
- [x] Preserve sparse rail blocks, dwell, navigation and map scrolling.
- [x] Replace synthetic-distance fixtures; verify full coverage and varied speeds.
- [x] Run complete unit/browser checks, inspect map and review final diff.

Detailed source notes and limitations live in data/railway/kyiv-lisbon/README.md.

Follow-up: rail construction is now independent of local limits. Only six
1–2 km replacement work sites use short rails (9.5 km total). All pre-follow-up
speed intervals are preserved exactly; other zones use 800/1,500 m rails.
