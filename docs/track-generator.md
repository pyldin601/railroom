# Track generator building blocks

This document defines the atoms and area blocks for the rewrite's track generator.
These are generator inputs; the output remains a flat, position-sorted array of
`TrackItem` records inside `Track`. Generator implementation is not included yet.

## Atoms

| Atom        | Extent | Meaning                                                      |
| ----------- | ------ | ------------------------------------------------------------ |
| Station     | Point  | A named station placed along the track                       |
| Speed limit | Point  | A speed restriction applying until the next speed-limit atom |
| 25 m rail   | 25 m   | Full short rail                                              |
| 12.5 m rail | 12.5 m | Short rail used between longer rails                         |
| 800 m rail  | 800 m  | Long rail used in a high-speed area                          |
| 1500 m rail | 1500 m | Long rail used in a high-speed area                          |

Rail atoms consume longitudinal distance. Station and speed-limit atoms are
annotations at positions and do not consume distance. Joining consecutive rail
atoms creates a joint at their shared boundary. A direct join has no intervening
rail; a connection via a 12.5 m rail has a joint at each end of that short rail.

## Blocks

### High-speed area with 800 m rails

A sequence of 800 m rails. Neighbouring 800 m rails join either directly or via
one 12.5 m rail.

```text
Direct:          [800 m] | [800 m]
Via short rail:  [800 m] | [12.5 m] | [800 m]
```

Both connection styles may occur within the area. The frequency and selection
rule for short-rail connections are not specified yet.

### High-speed area with 1500 m rails

A sequence of 1500 m rails joined directly.

```text
[1500 m] | [1500 m] | [1500 m] | …
```

No short connector rails are inserted within this block.

### Reduced-speed area with 25 m rails

A sequence of 25 m rails, inserting one or two 12.5 m rails after every fourth or fifth
25 m rail. Only 25 m rails count toward that cadence; inserted short rails do not.

```text
[25 m] | [25 m] | [25 m] | [25 m] | [25 m] | [12.5 m]
[25 m] | [25 m] | [25 m] | [25 m] | [25 m] | [12.5 m] | [12.5 m]
[25 m] | [25 m] | [25 m] | [25 m] | [12.5 m]
[25 m] | [25 m] | [25 m] | [25 m] | [12.5 m] | [12.5 m]
```

The four lines illustrate the allowed groups, not a required alternating pattern.
A group occupies 112.5, 125, 137.5, or 150 m. The rules choosing four versus five
full rails and one versus two short rails are not specified generally yet.

## Composition and runtime output

- Concatenate area blocks to construct the route. Rail positions follow from
  their cumulative lengths.
- Place station and speed-limit atoms at route positions independently of rail
  boundaries. A station does not automatically insert a joint or speed limit.
- Emit one joint per shared rail boundary, including boundaries between blocks.
  Do not emit duplicate joints where two blocks meet.
- Store placed objects as `{ position, object }`, ordered by position. Different
  objects may share a position.
- Rail atoms describe generator construction. The current `TrackObject` union
  has no rail variant; rail boundaries can be represented by its `Joint` variant.
  Station and speed-limit atoms map to its `Station` and `SpeedLimit` variants.

In the diagrams, `|` denotes a joint. All distances are in metres.

## Decisions still needed before implementation

- Numeric speed limits for the high-speed and reduced-speed areas.
- How block size is requested: rail/group count, target length, or another rule.
- Selection of direct versus short-rail joins in 800 m areas.
- Selection of one versus two short rails in reduced-speed areas.
- Handling incomplete groups or a target length that does not fit whole atoms.
- Whether route endpoints themselves produce joint events.

The current runtime also supports power-off and power-on markers. Their role in
generator inputs is outside this initial atom and block definition.

## Kyiv–Fastiv JSON

[public/tracks/kyiv-fastiv.json](../public/tracks/kyiv-fastiv.json) is a rebuilt
64,000 m route using these patterns and the current `Track` shape:
`{ length, items: [{ position, object }] }`. It retains the station positions,
speed-limit intervals, and power-switch positions from `legacy/public/route.json`.
Those positions and limits remain synthetic scenario data, not verified railway
operating data. Rail boundaries are rebuilt rather than copied from the legacy
layout.

For this concrete export:

- The seven 120 km/h areas alternate 800 m and 1500 m strings, starting with
  800 m strings. In each 800 m area, every fifth full string is followed by one
  12.5 m connector if there is room for a following string. Other joins are direct.
- Each reduced-speed area cycles groups of `(4, 1)`, `(5, 2)`, `(4, 2)`, `(5, 1)`
  full/short rails. Near the area end, the next feasible group in that cycle is
  selected so the remainder can still be filled with complete allowed groups.
  The cycle restarts for each area.
- Final long strings are shortened to fit existing area boundaries, as agreed.
  This exception introduces no internal fabrication joints. The shortened string
  lengths, in route order, are 737.5, 250, 637.5, 637.5, 250, and 37.5 m.
- Existing speeds are retained: 25 km/h at terminal approaches, 40 km/h in the
  other reduced-speed areas, and 120 km/h in high-speed areas, including connectors.
- Each internal rail boundary produces one `joint` item. Left/right duplicate
  events and all internal weld events are omitted. There are no endpoint joints.
- The file contains 873 joints, 19 stations, 16 speed limits, one `power_off`, and
  one `power_on`: 910 items total. Equal-position items are sorted by type for
  deterministic serialization; this does not define simulation event priority.

This is a static JSON asset; a reusable generator has not been added to the app.
