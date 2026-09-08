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

The two lines illustrate the allowed groups, not a required alternating pattern.
A group occupies 137.5 m with one short rail or 150 m with two. The rule choosing
one versus two short rails is not specified yet.

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
