"""Build the approved synthetic Kyiv–Lisbon scenario, without a per-rail inventory."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def build_route():
    itinerary = [
        ('UA', 'Kyiv', 0), ('UA', 'Shepetivka', 300), ('UA', 'Lviv', 580),
        ('PL', 'Przemyśl', 680), ('PL', 'Kraków', 930), ('PL', 'Katowice', 1010),
        ('PL', 'Wrocław', 1210), ('DE', 'Dresden', 1480), ('DE', 'Leipzig', 1600),
        ('DE', 'Frankfurt am Main', 1980), ('FR', 'Strasbourg', 2200),
        ('FR', 'Paris', 2690), ('FR', 'Bordeaux', 3270), ('FR', 'Hendaye', 3500),
        ('ES', 'Irún', 3505), ('ES', 'Burgos', 3785), ('ES', 'Valladolid', 3905),
        ('ES', 'Salamanca', 4030), ('PT', 'Guarda', 4190), ('PT', 'Coimbra', 4390),
        ('PT', 'Lisbon', 4610),
    ]
    stations = [dict(id=f'kyiv-lisbon/station/{i}', country=country, name=name,
                     position=km * 1000, positionStatus='estimated')
                for i, (country, name, km) in enumerate(itinerary)]
    length = stations[-1]['position']
    sections = []

    def section(start, end, construction):
        if sections and sections[-1]['construction'] == construction:
            sections[-1]['length'] = end - sections[-1]['position']
        else:
            sections.append(dict(id=f'kyiv-lisbon/section/{start}', position=start,
                                 length=end-start, construction=construction))

    for a, b in zip(stations, stations[1:]):
        start, end = a['position'], b['position']
        if end - start > 20000:
            middle = (start + end) // 2
            section(start, middle - 1000, 'welded')
            section(middle - 1000, middle + 1000, 'jointed')
            section(middle + 1000, end, 'welded')
        else:
            section(start, end, 'welded')
    restrictions = [(0, 1000, 25), (length - 1000, length, 25)]
    # Deterministic scenario variety, not surveyed local operating limits.
    restrictions += [(s['position'] - 1000, s['position'] + 1000, (40, 50, 60)[i % 3])
                     for i, s in enumerate(stations[1:-1])]
    jointed = [s for s in sections if s['construction'] == 'jointed']
    restrictions += [(s['position'], s['position'] + s['length'], (60, 40, 50)[i % 3])
                     for i, s in enumerate(jointed)]
    bounds = sorted({0, length} | {p for start, end, _ in restrictions for p in (start, end)})
    markers = []
    for start, end in zip(bounds, bounds[1:]):
        speed = min([260] + [limit for a, b, limit in restrictions if a <= start < b])
        if markers and markers[-1]['speedKmh'] == speed:
            markers[-1]['endPosition'] = end
        else:
            markers.append(dict(id=f'kyiv-lisbon/speed/{start}', type='speed_limit',
                                position=start, endPosition=end, speedKmh=speed,
                                status='estimated', basis='scenario-assumption'))
    return dict(id='kyiv-lisbon', name='Kyiv → Lisbon', length=length, synthetic=True,
                contactModel='periodic-v1',
                description='4,610 km · varied track · approximate route',
                assumptions='City-level stops and scenario distances, not surveyed chainage. Borders, transfers and gauge changes are abstracted. Track construction and speeds are illustrative.',
                stations=stations, sections=sections, operatingMarkers=markers)


if __name__ == '__main__':
    output = ROOT / 'public/kyiv-lisbon.json'
    output.write_text(json.dumps(build_route(), ensure_ascii=False, indent=2) + '\n')
    print(f'{output.name}: {output.stat().st_size:,} bytes')
