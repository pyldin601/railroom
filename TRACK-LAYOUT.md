# Mixed Kyiv–Fastiv track model

This is an illustrative, deterministic layout on the existing approximate 64 km route, not a survey or a claim about current Kyiv–Fastiv infrastructure. It models an older jointed station approach / renewed welded running-track pattern. Stations can have welded track in reality; a station marker alone does not require a joint.

| Position (km) | Construction |
|---|---|
| 0–1.5 | 25 m jointed |
| 1.5–6.25 | Welded strings |
| 6.25–7.75 | 25 m jointed |
| 7.75–14 | Welded strings |
| 14–17 | 25 m jointed |
| 17–23.25 | Welded strings |
| 23.25–25.25 | 12.5 m jointed |
| 25.25–34.25 | Welded strings |
| 34.25–35.75 | 25 m jointed |
| 35.75–42 | Welded strings |
| 42–45 | 25 m jointed |
| 45–51.25 | Welded strings |
| 51.25–53.25 | 12.5 m jointed |
| 53.25–60.5 | Welded strings |
| 60.5–62.5 | 12.5 m jointed |
| 62.5–64 | 25 m jointed |

Totals: **12 km of 25 m jointed track, 6 km of 12.5 m jointed track,
and 46 km of welded track**. The additional sections are illustrative choices
for varied listening rhythm. Jointed sections are limited to 40 km/h, with 25 km/h at the departure and
arrival approaches. Only welded strings have the full 120 km/h route limit.
These are scenario choices followed by autopilot; manual driving can exceed them.

Within each welded section, use the fewest strings needed to keep each string
at most 800 m, joining consecutive strings directly with one joint per rail.
Distribute 25 m fabrication units evenly among strings to avoid tiny end pieces.
This yields 725–800 m strings. Both running rails use the same boundaries.

Internal fabrication welds are silent. Jointed rail ends and welded string ends
produce wheel impacts. The 12.5 m sections double the joint frequency at a given
speed compared with 25 m sections. Separate all-jointed 25 m and 12.5 m demos are available in the route selector.
Audition at 72 km/h uses the selected demo, defaulting to 25 m from the Kyiv route.

The runtime JSON contains `sections`, `rails`, `events`, and `stations`. Each object has a UUID and a metre `position`; rail spans also have `length`, `side`, and `construction`. A welded `rail` span represents an assembled string, with `fabricationLength: 25.0`, rather than a single rolled rail. Existing connection and station UUIDs are retained; added 12.5 m midpoint joints use deterministic UUIDv5; new spans and sections use deterministic UUIDv5. Original fastening and individual-rail records remain in the preserved source inventory and are not part of this runtime variant.

Sources supporting the construction pattern (not the chosen chainages):

- [ДСТУ 4344:2004, §4.8 and Table 3](https://dnaop.com/html/59639/doc-%D0%94%D0%A1%D0%A2%D0%A3_4344_2004): nominal 25 m rails, among other available lengths.
- [Ukrainian State University of Railway Transport textbook, §5.4](https://lib.kart.edu.ua/bitstream/123456789/2452/1/Навчальний%20посібник.pdf): welded strings commonly up to 800 m, separated by three or four adjustment links. That source describes an adjustment-link construction variant. The current user-selected model instead joins strings directly; it does not reproduce those adjustment links.

Regenerate with `npm run build:route`. Tests check coverage, maximum string length, UUIDs, every connection type, section continuity, and the approach/running-track distinction.
