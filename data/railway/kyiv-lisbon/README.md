# Kyiv–Lisbon simplified passenger corridors

This 4,447 km scenario keeps the 21 approved city stops and follows the idea of
main passenger corridors, including high-speed lines. **Distances and speed-zone
boundaries are approximate. This is not a real operational speed chart.**

The user chose a simplified route after the initial real-alignment investigation.
OpenRailRouting/OpenStreetMap paths totalled about 4,454 km; each leg is rounded
to the nearest 5 km, except Hendaye–Irún (2 km). The Paris Gare de l’Est–Montparnasse
transfer adds no driving distance. Borders, gauge changes and transfers remain
abstracted. This itinerary does not imply a current through passenger service.

`corridors.json` is the compact editable definition: ordered stops, rounded leg
lengths, optional corridor waypoints and a handful of representative running
zones per leg. Zone lengths and speeds are hand-authored simulation assumptions,
not measured limits at precise coordinates. Regular running varies from 80 to
220 km/h; high-speed corridors use the previously requested 260 km/h cap.
Sourced infrastructure maxima can be higher (e.g. 300/320 km/h in France), but
those values are not the simulation's selected operating limits.

Rebuild with `npm run build:lisbon`. The deterministic builder is
`scripts/build-lisbon-route.py`; the browser loads `public/kyiv-lisbon.json`.
Kyiv–Fastiv remains default; it and both 64 km demos are unchanged.

## Rounded itinerary

| Stop | Country | Cumulative km |
|---|---|---:|
| Kyiv | UA | 0 |
| Shepetivka | UA | 305 |
| Lviv | UA | 575 |
| Przemyśl | PL | 670 |
| Kraków | PL | 925 |
| Katowice | PL | 1000 |
| Wrocław | PL | 1180 |
| Dresden | DE | 1450 |
| Leipzig | DE | 1570 |
| Frankfurt am Main | DE | 1945 |
| Strasbourg | FR | 2165 |
| Paris | FR | 2605 |
| Bordeaux | FR | 3140 |
| Hendaye | FR | 3375 |
| Irún | ES | 3377 |
| Burgos | ES | 3642 |
| Valladolid | ES | 3772 |
| Salamanca | ES | 3892 |
| Guarda | PT | 4062 |
| Coimbra | PT | 4232 |
| Lisbon | PT | 4447 |

## Research and attribution

Research date: 2026-09-08. These sources informed the corridor choices and speed
ranges; they do not verify our simplified speed intervals.

- [OpenRailRouting](https://routing.openrailrouting.org/maps/) and
  [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL:
  railway-path distances, with corridor anchors such as Korosten, Zdolbuniv,
  Görlitz, Riesa, Erfurt, Fulda, Mannheim, Karlsruhe, Vitoria, Medina del Campo,
  Vilar Formoso and Pampilhosa. Derived rounded distance data in `corridors.json`
  is attributed to OpenStreetMap and available under ODbL.
- [SNCF nominal speed dataset](https://data.sncf.com/explore/dataset/vitesse-maximale-nominale-sur-ligne/):
  excludes temporary restrictions and describes the fastest nominal train category.
  The 2025-05-05 government mirror reviewed during research includes 300/320 km/h
  LGV Est and SEA sections. It is not a current dispatching reference.
- [DB Erfurt–Leipzig/Halle information](https://www1.deutschebahn.com/resource/blob/264504/820f84dd3f9c13ec6d4ec521e50b652e/db_informationszentrum_kalzendorf-data.pdf):
  high-speed corridor context.
- [Adif Venta de Baños–Burgos–Vitoria](https://www.adifaltavelocidad.es/sobre-adif-av/red-av/venta-banos-vitoria):
  high-speed corridor context; not a source for the chosen 260 cap.
- [Infraestruturas de Portugal, Linha do Norte](https://www.infraestruturasdeportugal.pt/pt-pt/node/8068):
  describes selected sections reaching 220 km/h; our wider zone extents are approximate.

The investigation found OpenRailRouting's returned `max_speed` can truncate at
252 km/h. No such encoded values or missing-data defaults are imported into this
profile. Full geometry import and raw OSM matching were dropped when the user
chose simplification. No runtime network lookup or database is required.

## Track building blocks

The route uses six synthetic rail-replacement work sites of 1–2 km each.
Only these sites have 25 m rails with 12.5 m inserts. Between them, long-rail
areas alternate 800 m and 1,500 m rails, starting with an 800 m area. Local
speed restrictions are independent: stations and longer slow zones use long
rails unless they overlap one of the work sites.

- **800 m areas:** direct rail joins, with one 12.5 m connector after every fifth
  full 800 m rail when another complete 800 m rail fits after that connector.
- **1,500 m areas:** direct rail joins without connector rails.
- **Rail-replacement sites:** 25 m rails in groups of four or five, followed by one or two
  12.5 m rails. Only the 25 m rails count toward the cadence.

Work sites cycle `(4,1)`, `(5,2)`, `(4,2)`, `(5,1)` full/short groups. The
builder chooses the next feasible group when needed so the remaining distance
can still be filled with complete groups; every area starts the cycle afresh.
It rejects a reduced-area length that cannot be filled exactly. All requested
area lengths must be positive multiples of 12.5 m. Long areas may shorten their
last long rail to meet the existing endpoint; they never add fabrication welds
inside that rail. No connector is left hanging at an area's endpoint.

| Rail-replacement site (km) | Length (km) |
|---|---:|
| 116–117 | 1 |
| 434–435.5 | 1.5 |
| 1235–1237 | 2 |
| 2103–2104.25 | 1.25 |
| 3183–3184.75 | 1.75 |
| 4080–4082 | 2 |

Total short-rail distance: **9.5 km**. Work locations are simulation assumptions.

Rail construction remains synthetic and is independent of the corridor speed
profile. Twelve local speed zones retain their existing 40/50/60 km/h restrictions, and stations
retain 1 km approaches/departures at 40/50/60 km/h (25 at the termini). Overlapping
restrictions take the lowest speed. All adjacent equal speed intervals merge.
The locomotive and high-speed running cap remain 260 km/h. Autopilot follows
limits and uses the passenger dwell schedule below. No power-switch locations
are added.

## Runtime adaptation

The generator's `build_rails(length, block)` returns placed rail lengths for an
area. This application keeps its own section/station/speed metadata and uses
`contactModel: rail-blocks-v1` with compact `railLengths` arrays, rather than the
external implementation's object layout. Rail lengths are cumulatively indexed
once into physical boundary positions; interval queries use binary search.

Every shared rail boundary, including an area boundary, generates an impact.
In running sections rated at least 200 km/h on both sides of the join, alternate
eligible long-string joins are welded. Both adjacent rails must be at least 800 m;
short connectors, work sites and area boundaries remain ordinary joints. These
are synthetic construction choices, independent of the timetable and limits.
Welded joins use 18% of the ordinary impact amplitude (about 15 dB quieter),
including the metal tail. They remain audible, unlike silent internal fabrication
weld markers on legacy routes. `weldedJoins` stores the incoming rail indices;
contacts keep their positions, IDs and binary-search behavior.
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

## Passenger stops

These are scenario timetable choices based on hub importance, not official schedules.
Ten-minute stops: Lviv, Przemyśl, Kraków, Wrocław, Dresden, Leipzig, Frankfurt am Main,
Strasbourg, Paris and Bordeaux. The other nine intermediate stops take five minutes.
`dwellSeconds` in `corridors.json` controls each stop; countdowns use simulation time,
so pausing also pauses the stop. Station tooltips and navigation show the duration.

Intermediate dwell totals 2 h 25 min. Combined with distance divided by each limit,
arrival is approximately 33 h 29 min; acceleration and braking add further time.
Kyiv starts immediately and Lisbon retains the existing one-minute completion dwell
after arrival (excluded from that arrival estimate). Routes without station dwell
metadata, including Kyiv–Fastiv, retain their one-minute dwell.
