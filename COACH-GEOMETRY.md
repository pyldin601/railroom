# КВБЗ 61-779 / ТВЗ-ЦНИИ-М

The simulator uses this specific documented coach/bogie pairing, not a universal Ukrainian passenger-coach layout. All ten coaches share it.

| Dimension | Metres |
|---|---:|
| Bogie axle spacing | 2.4 |
| Bogie centre spacing | 19.0 |
| Coach pitch over coupling axes | 26.696 |
| Axles relative to each coach's leading axle | 0, 2.4, 19, 21.4 |
| Last axle to next coach's first axle (derived) | 5.296 |
| Coach centre relative to leading axle (derived) | 10.7 |
| Carriage-five centre behind train's leading axle (derived) | 117.484 |

Sources:
- [Shcherbyna dissertation, Table 1.1](https://files.duit.edu.ua/uploads/Сайт/3_НАУКА/СПЕЦ_РАДИ/К-26-820-01/Щербина-Ю-В/dyssertatsyia_shcherbyna-iu_v.pdf) explicitly pairs 61-779 with ТВЗ-ЦНИИ-М, with a 19 m coach base and 2.4 m bogie base. Other variants use other bogies; notably this source lists 2.56 m for 68-7007/7012 on 61-788.
- [Railway university publication, Table 2](https://crust.ust.edu.ua/server/api/core/bitstreams/97e55c59-82fd-4b13-88df-d0299fffa29b/content) gives 26,696 mm over coupling axes and a 19,000 mm coach base for 61-779.

`src/route/coach-geometry.js` supplies the wheel positions, carriage pitch, seat centre, carriage isolation lookup and schematic spacing. At 72 km/h the two axles of one bogie cross a joint 120 ms apart; at 90 km/h they are 96 ms apart.

The middle listener position is the coach's geometric longitudinal centre, not a numbered berth from an interior drawing. Front/rear seat positions are illustrative (2 / 19.4 m behind that coach's leading axle). Coupling slack is ignored. The drawn body leaves 0.5 m at each coupling end as a visual approximation; windows and body shape are schematic. This geometry does not change the existing generic motor, brake or resonant sound models into measurements of this coach. Five audible carriages and their isolation gains remain unchanged.
