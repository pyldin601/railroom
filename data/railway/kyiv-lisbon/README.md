# Kyiv–Lisbon synthetic journey

The 4,610 km scenario follows the approved city-level itinerary through Ukraine,
Poland, Germany, France, Spain and Portugal. The itinerary contains 21 stops
(the initial plan called it 22, but its table listed 21). Distances are modelling
assumptions, not official railway chainage. Borders, gauge changes and transfers
are abstracted into continuous driving; this does not represent a through service.

Rebuild the compact asset with `npm run build:lisbon`. The deterministic source is
`scripts/build-lisbon-route.py`; the browser loads `public/kyiv-lisbon.json`.
Kyiv–Fastiv and the two 64 km jointed demos remain separate selections.

## Track and operation

Running track is welded, except for a 2 km jointed stretch centred in every leg
longer than 20 km. The short Hendaye–Irún leg has no jointed stretch. Adjacent
welded sections are merged. Track construction is illustrative, not a regional
infrastructure claim.

Jointed sections repeat seven 25 m intervals and one 12.5 m interval. The last
rail is clipped to its section boundary. Welded sections have a visual contact
every 25 m; these welds do not produce impact sounds. Section boundaries produce
one contact per side, jointed if either adjacent section is jointed, otherwise
welded. There is no contact at the start or endpoint of the whole route.

The speed profile is 260 km/h on running track and 25 km/h in the first/last
1 km. Restrictions within 1 km either side of intermediate stations cycle through
40, 50 and 60 km/h in route order. Jointed stretches cycle through 60, 40 and
50 km/h independently. These repeatable variations are scenario assumptions. Adjacent identical limits merge. The locomotive maximum is 260 km/h.
Autopilot follows these limits and brakes for every stop; manual driving retains
its existing behavior. No power switching locations are asserted. Every listed
city is an autopilot stop with
the existing 60-second dwell. Distances and simulation time are not compressed.

## Compact contacts

`contactModel: periodic-v1` opts into section-based contact queries. Existing
explicit-event route assets remain supported. `RouteIndex.between(start, end)`
returns contacts in `(start + 1e-8, end + 1e-8]`, with stable route/position/side IDs and
left before right at each position. A binary section lookup and arithmetic rail
index avoid scanning the route prefix or materializing the full contact array.
`contactCount` reports the full-route total for either representation.

The route overview shows stations and estimated speed limits. Speed-marker
tooltips include the limit and its distance range, as on Kyiv–Fastiv.

The map shows at most 1,000 km at a time, following the train with a centred
window except where clamped to route endpoints. Short routes remain fully
visible. Station jumps, reset and route selection reposition the window; pause
holds it still. An active speed section that began outside the window is shown
at the left edge, retaining its original distance-range tooltip.
