# Operating markers — illustrative operating data

Research date: 2026-09-07. No current official line speed order, selected station track/turnout route, or contact-network plan was verified. **None of the numeric limits or marker coordinates below is a verified operating instruction.** The existing 64 km route and rail-construction zones are synthetic; coordinates are meters from its Kyiv origin, not official railway chainage.

`public/route.json` contains an `operatingMarkers` array separate from wheel-contact `events`. Each marker has a deterministic UUID, numeric meter position, direction, applicability and evidence status. `speed_limit` applies from `position` to exclusive `endPosition`; the last interval reaches the route endpoint. `verifiedSpeedKmh: null` explicitly distinguishes scenario speed from an established limit. Electrical markers now cut/restore traction and schedule contactor sounds. Autopilot follows speed markers; manual driving can exceed them. Power state is derived from position on seek/resume, without replaying skipped switch sounds. Marker crossing uses the leading-axle route coordinate as the locomotive reference; no separate pantograph coordinate is modeled.

| Construction / area | Scenario km/h |
|---|---:|
| Kyiv departure (0–1500 m), Fastiv arrival (62500–64000 m) | 25 |
| Other 25 m jointed sections, including interspersed short rails | 40 |
| All short connector groups between welded strings | 120 |
| Welded strings | 120 |

Each connector interval keeps the surrounding welded limit, with no speed
reduction at either boundary. See [track layout](TRACK-LAYOUT.md) for the full corridor and connector list.

This meets the requested station-zone versus welded-running-zone contrast as a scenario assumption. A 25 m rail does not inherently require a low speed, and an 800 m welded string does not prove that 120 km/h is allowed. Station track selection, curves, infrastructure condition, vehicle limits and temporary restrictions can change the real profile. The 120 value is the simulator scenario's full speed, not a verified route maximum.

## Boiarka electrical section

A [firsthand report dated 14 August 2020](https://explorer.lviv.ua/forum/index.php?topic=8599.0) describes a neutral section near Boiarka station throat by the Prytvarka river. It establishes a historical reported feature, not its current condition, exact direction or chainage.

The model places `power_off` at 23500 m and `power_on` at 23800 m, near its Boiarka marker at 23000 m. **Both placements and their 300 m separation are illustrative.** They represent locomotive power switching signs; they are not commands to lower/raise the pantograph and do not establish the physical neutral-wire length. Both share `groupId: boiarka-neutral-section`, apply only in the modeled Kyiv-to-Fastiv direction, and are marked estimated.

## Research limits

Searches found an unverified reproduction of Southwestern Railway order 186N mentioning Kyiv-Pas. 40/25, but its full table, date and applicability could not be checked. It was not used to assert a current limit. General turnout rules cannot establish which speed applies to our unspecified departure route. A current railway speed order and station/contact-network plans are needed to replace these estimates.

Regenerate with `python3 scripts/build-route.py`. The marker generator is `scripts/operating_markers.py`. Existing track, rail, station and contact objects are preserved.

## Complete passenger stopping-point list

The route now contains all 19 points listed by the [local Kyiv–Fastiv timetable](https://boyarka-shop.in.ua/ukr/train2s/6/1/), updated 2026-08-04 and checked 2026-09-07. Eleven smaller stops were added: Tarasivka, Maliutynka, Shliakhova, Hlevakha, Danylivka (also listed as 888 km), Korchi, Bilky, Pivni, Vyshniaky, Sorochyi Brid and Snitynka. These appear in the overview, next-stop display and jump selector. This is the passenger stopping-point list, not a complete inventory of railway posts or sidings; individual services may skip stops.

Names and ordering are sourced; coordinates are illustrative additions between the existing eight synthetic anchors. The name “888 km” is an alias, not a distance from Kyiv in this model. All station tooltips identify approximate positions. Adding stops does not insert extra joints, restrictions or automatic station braking.
