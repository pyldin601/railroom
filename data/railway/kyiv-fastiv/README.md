# Kyiv–Fastiv synthetic railway objects

`objects.json` is a flat array of 245,766 objects sorted by `position`, measured in metres from Kyiv-Pasazhyrskyi (0.0) toward Fastiv I (64000.0). Every object has a UUID `id`, `type`, and floating-point `position`.

This is a synthetic longitudinal model, not a surveyed asset inventory. See `metadata.json` for assumptions and sources and `sample.json` for a small preview.

- One track, two rails, 5,120 nominal 25 m rail sections.
- 235,520 fastening assemblies, about 0.543478 m apart on each rail; sleepers are implicit.
- 5,056 welds and 62 simulated insulated bonded joints. Each internal rail boundary has exactly one connection per rail.
- Existing objects retain their UUIDs; their positions shifted by 7,000 m when the Kyiv-Pasazhyrskyi section was added.

Approximate station/stop markers:

| Marker | Position (m) |
|---|---:|
| Kyiv-Pasazhyrskyi | 0.0 |
| Karavaievi Dachi | 3500.0 |
| Kyiv-Volynskyi | 7000.0 |
| Vyshneve | 12000.0 |
| Boiarka | 23000.0 |
| Vasylkiv I | 35000.0 |
| Motovylivka | 47000.0 |
| Fastiv I | 64000.0 |

Not all passenger stops are included. Station positions are approximate model assumptions. Left and right are viewed toward Fastiv. Rails use `position` for their start and `length` for their span. Fastenings reference `railId`; connections reference `previousRailId` and `nextRailId`. Multiple objects can share a longitudinal position. Numbers are rounded to six decimal places without implying survey precision.

Validated after serialization: UUID uniqueness, floating-point positions, sorting and bounds, complete rail coverage, one connection per internal boundary, connection and fastening references, fastening spacing and counts, station endpoints, and metadata totals.
