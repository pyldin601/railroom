# Track build blocks

Inventory checked against the repository on 2026-09-08. This documents the
existing model and gives its pieces a build-block vocabulary. There is no
separate block schema or track editor yet. All route distances and construction
placements describe the synthetic Kyiv–Fastiv scenario.

## Definition

A **track build block** is a longitudinal piece of track construction: a pair
of matching left/right rail spans, or a group of those pairs. The existing
generator builds both sides with identical positions and lengths. This term is
documentation vocabulary; JSON still stores individual `rail` records and
groups them through `sectionId`.

| Block | Existing representation | Composition |
|---|---|---|
| Full jointed rail pair | Two `rail` records, `construction: jointed` | 25 m, one rail per side |
| Short jointed rail pair | Two `rail` records, `construction: jointed` | 12.5 m, one rail per side |
| Welded string pair | Two `rail` records, `construction: welded` | Currently 712.5–800 m; internal fabrication seams every 25 m from the string start, with a possible trimmed 12.5 m end piece |
| Jointed section | `section` plus its rail pairs | Repeats 5–10 full pairs followed by 1–2 short pairs; ends with 1–2 short pairs |
| String connector | Jointed `section`, `purpose: string connector` | 1–5 short pairs or 1–2 full pairs; one rail length per group, between welded strings |
| Welded section | Welded `section` plus its string pairs | One or more consecutive welded string pairs |

Connections and operating markers are separate items placed along these blocks.
A station marker does not itself insert a joint, connector, or speed restriction.

## Existing runtime item types

Source: [generated route](public/route.json), produced by
[route generator](scripts/build-route.py) and
[marker generator](scripts/operating_markers.py).
Counts below are records in the current generated route; rail and contact counts
include both sides.

| Item | Collection / discriminator | Count | Meaning |
|---|---|---:|---|
| Construction section | `sections`, `type: section` | 36 | Contiguous span grouping rails; 19 jointed sections (including 10 connectors), 17 welded sections |
| Rail span | `rails`, `type: rail` | 1,730 | 1,322 full jointed rails, 288 short jointed rails, 120 welded strings |
| Joint | `events`, `type: joint` | 1,728 | Internal boundary between rail spans, including direct string joins; generates wheel impacts |
| Fabrication weld | `events`, `type: weld` | 3,562 | Internal seam within a welded string; skipped by wheel-impact processing |
| Station / passenger stop | `stations`, no `type` field | 19 | Named point used for display, seeking, and autopilot stops |
| Speed interval | `operatingMarkers`, `type: speed_limit` | 16 | Scenario speed from `position` to exclusive `endPosition`, with the final interval reaching the route endpoint |
| Power-off marker | `operatingMarkers`, `type: power_off` | 1 | Cuts locomotive traction |
| Power-on marker | `operatingMarkers`, `type: power_on` | 1 | Restores locomotive traction |

### Fields and relationships

- Every generated item has an `id` and `position` in metres from the route origin.
- Sections add `length`, `construction`, and `reason`; some also have `purpose`.
- Rails add `side`, `length`, `construction`, `fabricationLength`, `purpose`, and
  `sectionId`. A welded rail record represents a whole assembled string.
- Contact events add `side` and `type`. Runtime events do not carry rail IDs or
  source-inventory joint subtypes. Route endpoints have no generated contacts.
- Stations add `name`, `positionStatus`, and `sourceUrl`.
- Operating markers add direction, applicability, evidence status, and their
  type-specific fields. Speed intervals reference their covered `sectionIds`;
  the electrical pair shares a `groupId`.

Construction, contacts, and operating rules are distinct: short connectors use
jointed rails but retain the surrounding 120 km/h scenario limit. Long jointed
areas use 40 km/h, with 25 km/h at the terminal approaches. Manual driving can
exceed these limits; autopilot follows them. Electrical markers use the leading
axle as their position reference. See [operating markers](OPERATING-MARKERS.md).

## Preserved source inventory

[objects.json](data/railway/kyiv-fastiv/objects.json) is a separate, older inventory,
not the runtime block list. Its five explicit `type` values are:

| Type | Count | Source-specific details |
|---|---:|---|
| `rail` | 5,120 | Nominal 25 m rails with `side`, `length`, and `profile: R65` |
| `fastening` | 235,520 | Per-side fastening assembly referencing `railId` |
| `weld` | 5,056 | `subtype: welded`, references `previousRailId` and `nextRailId` |
| `joint` | 62 | `subtype: insulated_bonded`, references adjacent rail IDs |
| `station` | 8 | Original named station anchors |

Fastenings are absent from the runtime route. Sleepers are implicit in the
source inventory, not standalone items. Runtime generation preserves original
connection IDs where a connection still occupies the same position and side,
but determines `joint` versus `weld` from the new construction; an ID alone does
not preserve the source connection type.

There are no explicit turnout, crossing, curve, gradient, bridge, tunnel,
signal, sleeper, or physical overhead-wire span types in these datasets.
The power marker pair represents switching instructions, not a neutral-wire
geometry block.

See [track layout](TRACK-LAYOUT.md) for the existing arrangement and connector
positions, and [source inventory notes](data/railway/kyiv-fastiv/README.md) for
the preserved inventory assumptions.
