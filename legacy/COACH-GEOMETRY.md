# Cairo carriage geometry

The active profile uses the user-supplied `CAIRO_*` constants in
`src/route/coach-geometry.js`. All distances are metres.

| Parameter | Value |
|---|---:|
| Default carriage count | 10 |
| Carriage length / pitch | 24.75 |
| Distance between bogie pivots | 17 |
| Axle spacing within each bogie | 2.4 |
| Axles relative to each carriage’s leading axle | 0, 2.4, 17, 19.4 |
| Last axle to next carriage’s first axle | 5.35 |
| Carriage centre behind its leading axle | 9.7 |
| Symmetric coupler overhang beyond end axle | 2.675 |
| Total ten-carriage length | 247.5 |
| Default listener behind the train’s leading axle | 108.7 |

Length is interpreted as coupler-to-coupler spacing, with symmetric bogie placement
and no coupling slack. The default listener is in carriage five. Front/middle/rear
seat presets are illustrative positions at 2, 9.7 and 17.4 m behind the carriage’s
leading axle. The single-carriage option uses the same local presets.

The drawn body leaves 0.5 m at each coupling end as a visual approximation;
windows and body shape are schematic. Geometry drives axle timing, the train
canvas and spatial audio. Motor, brake and resonance models remain generic.
The helpers still support longer consists for the ten-carriage audio stress tests.
