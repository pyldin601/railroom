# Kyiv–Lisbon synthetic journey

The 4,610 km scenario follows the approved city-level itinerary through Ukraine,
Poland, Germany, France, Spain and Portugal. The itinerary contains 21 stops
(the initial plan called it 22, but its table listed 21). Distances are modelling
assumptions, not official railway chainage. Borders, gauge changes and transfers
are abstracted into continuous driving; this does not represent a through service.

Rebuild the compact asset with `npm run build:lisbon`. The deterministic source is
`scripts/build-lisbon-route.py`; the browser loads `public/kyiv-lisbon.json`.
Kyiv–Fastiv and the two 64 km jointed demos remain separate selections.

## Track building blocks

The route keeps twelve reduced-speed zones of 6–24 km. Between them, long-rail
areas alternate 800 m and 1,500 m rails, starting with an 800 m area. Block
extents, station positions and the existing operating profile are unchanged.

- **800 m areas:** direct rail joins, with one 12.5 m connector after every fifth
  full 800 m rail when another complete 800 m rail fits after that connector.
- **1,500 m areas:** direct rail joins without connector rails.
- **Reduced areas:** 25 m rails in groups of four or five, followed by one or two
  12.5 m rails. Only the 25 m rails count toward the cadence.

Reduced areas cycle `(4,1)`, `(5,2)`, `(4,2)`, `(5,1)` full/short groups. The
builder chooses the next feasible group when needed so the remaining distance
can still be filled with complete groups; every area starts the cycle afresh.
It rejects a reduced-area length that cannot be filled exactly. All requested
area lengths must be positive multiples of 12.5 m. Long areas may shorten their
last long rail to meet the existing endpoint; they never add fabrication welds
inside that rail. No connector is left hanging at an area's endpoint.

| Reduced zone (km) | Length (km) |
|---|---:|
| 0–6 | 6 |
| 120–132 | 12 |
| 450–470 | 20 |
| 850–858 | 8 |
| 1280–1296 | 16 |
| 1720–1744 | 24 |
| 2180–2192 | 12 |
| 2830–2846 | 16 |
| 3300–3306 | 6 |
| 3810–3822 | 12 |
| 4230–4240 | 10 |
| 4598–4610 | 12 |

The speed profile retains 260 km/h running sections, 25 km/h terminal approaches
and varied 40/50/60 km/h restrictions. Speed annotations are independent inputs:
placing a station or an inserted connector does not itself create a speed limit
or split an existing rail. Connectors inherit their area's existing limit.
The locomotive maximum remains 260 km/h. Autopilot follows limits and stops at
each city with the existing 60-second dwell. No power-switch locations are added.

## Runtime adaptation

The generator's `build_rails(length, block)` returns placed rail lengths for an
area. This application keeps its own section/station/speed metadata and uses
`contactModel: rail-blocks-v1` with compact `railLengths` arrays, rather than the
external implementation's object layout. Rail lengths are cumulatively indexed
once into physical boundary positions; interval queries use binary search.

Every shared rail boundary, including an area boundary, generates an impact.
There are no endpoint joints and no internal fabrication-weld events. Each
physical boundary is represented once per left/right rail side, as required by
this simulator's wheelset audio interface. Stations and speed markers may share
positions with boundaries but never create additional contacts.

Existing explicit-event routes and older `periodic-v1` assets are still supported.
`RouteIndex.between(start, end)` retains `(start + 1e-8, end + 1e-8]` query semantics,
stable route/position/side IDs and left-before-right order. `contactCount` reports
the full-route side-contact count without allocating full contact objects.

The scrolling map shows stations, speed changes and colored area bands. Tooltips
describe the 800 m, 1,500 m and reduced-area patterns. At most 1,000 km is visible;
the view follows the train and clamps at route endpoints. Speed badges remain
readable in separate rows and carried-in limits stay visible at the left edge.
