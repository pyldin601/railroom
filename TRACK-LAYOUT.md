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
| 23.25–25.25 | 25 m jointed |
| 25.25–34.25 | Welded strings |
| 34.25–35.75 | 25 m jointed |
| 35.75–42 | Welded strings |
| 42–45 | 25 m jointed |
| 45–51.25 | Welded strings |
| 51.25–53.25 | 25 m jointed |
| 53.25–60.5 | Welded strings |
| 60.5–62.5 | 25 m jointed |
| 62.5–64 | 25 m jointed |

The table describes the broad corridors; welded corridors include the occasional
connectors below. Totals: **18 km of predominantly 25 m jointed sections,
325 m of jointed connectors, and 45.675 km of welded strings**.
Every 5–10 full 25 m rails are followed by one or two 12.5 m rails.
Within the 25 m jointed sections, no consecutive short-rail run exceeds two. Each jointed section ends with one or two 12.5 m rails
at its exact boundary. Placement varies deterministically and
is identical on both sides. The additional sections are illustrative choices
for varied listening rhythm. Jointed sections are limited to 40 km/h, with 25 km/h at the departure and
arrival approaches. Only welded strings have the full 120 km/h route limit.
These are scenario choices followed by autopilot; manual driving can exceed them.

Most welded strings join directly: **43 direct joins and 10 connector groups**.
Every fifth string join receives a connector. Two out of three connector groups
use 12.5 m rails (cycling through 1–5); the other uses 25 m rails (alternating
1–2). Each group uses only one rail length and is bounded by welded strings.

| Connector start (m) | Rails |
|---:|---|
| 5450 | 1 × 12.5 m |
| 11650 | 2 × 12.5 m |
| 19350 | 1 × 25 m |
| 26000 | 3 × 12.5 m |
| 29725 | 4 × 12.5 m |
| 33462.5 | 2 × 25 m |
| 39625 | 5 × 12.5 m |
| 47362.5 | 1 × 12.5 m |
| 53975 | 1 × 25 m |
| 57625 | 2 × 12.5 m |

Connector lengths are reserved within existing corridor boundaries. Remaining
length is balanced among strings on a 12.5 m grid, producing **712.5–800 m**
strings. Fabrication welds occur every 25 m relative to each string’s start;
a string may have a trimmed 12.5 m end piece. Both sides use identical boundaries.
Each connector is an explicit jointed section limited to 40 km/h, followed by
restoration of 120 km/h on the next string. Autopilot follows these limits.

Internal fabrication welds are silent. Jointed rail ends and welded string ends
produce wheel impacts. Interspersed 12.5 m rails briefly shorten the interval between joint impacts. Separate all-jointed 25 m and 12.5 m demos are available in the route selector.
Audition at 72 km/h uses the selected demo, defaulting to 25 m from the Kyiv route.

The runtime JSON contains `sections`, `rails`, `events`, and `stations`. Each object has a UUID and a metre `position`; rail spans also have `length`, `side`, and `construction`. A welded `rail` span represents an assembled string, with `fabricationLength: 25.0`, rather than a single rolled rail. Existing connection UUIDs are retained wherever a physical joint or fabrication weld still exists; original seams inside uninterrupted jointed rails are omitted. Station UUIDs are retained; added joints use deterministic UUIDv5; new spans and sections use deterministic UUIDv5. Original fastening and individual-rail records remain in the preserved source inventory and are not part of this runtime variant.

Sources supporting the construction pattern (not the chosen chainages):

- [ДСТУ 4344:2004, §4.8 and Table 3](https://dnaop.com/html/59639/doc-%D0%94%D0%A1%D0%A2%D0%A3_4344_2004): nominal 25 m rails, among other available lengths.
- [Ukrainian State University of Railway Transport textbook, §5.4](https://lib.kart.edu.ua/bitstream/123456789/2452/1/Навчальний%20посібник.pdf): welded strings commonly up to 800 m, separated by three or four adjustment links. That source describes an adjustment-link construction variant. The model uses mostly direct joins with occasional user-selected connectors; their frequency and lengths are illustrative, not a reproduction of that standard arrangement.

Regenerate with `npm run build:route`. Tests check coverage, maximum string length, UUIDs, every connection type, section continuity, and the approach/running-track distinction.
