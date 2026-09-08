"""Build the simplified Kyiv–Lisbon passenger-corridor scenario."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def build_rails(length, block):
    """Fill one area; rail sizes create boundaries, annotations never do."""
    if not isinstance(length, (int, float)) or length <= 0 or length % 12.5:
        raise ValueError('Area length must be a positive multiple of 12.5 m')
    if block in ('long-800', 'long-1500'):
        nominal = 800 if block == 'long-800' else 1500
        rails, remaining, full = [], length, 0
        while remaining:
            size = min(nominal, remaining)
            rails.append(size)
            remaining -= size
            full += size == nominal
            # Connect only when another complete long rail fits afterwards.
            if nominal == 800 and full % 5 == 0 and remaining >= nominal + 12.5:
                rails.append(12.5)
                remaining -= 12.5
        return rails
    if block != 'short-25':
        raise ValueError(f'Unknown area block: {block}')
    groups = [(4, 1), (5, 2), (4, 2), (5, 1)]
    units = int(length / 12.5)
    feasible = [True] + [False] * units
    for n in range(1, units + 1):
        feasible[n] = any(n >= 2 * full + short and feasible[n - 2 * full - short]
                          for full, short in groups)
    if not feasible[units]:
        raise ValueError('Reduced area cannot be filled with complete rail groups')
    rails, cursor = [], 0
    while units:
        for shift in range(len(groups)):
            selected = (cursor + shift) % len(groups)
            full, short = groups[selected]
            used = 2 * full + short
            if units >= used and feasible[units - used]:
                rails.extend([25] * full + [12.5] * short)
                units -= used
                cursor = (selected + 1) % len(groups)
                break
    return rails


def build_route():
    definition = json.loads((ROOT / 'data/railway/kyiv-lisbon/corridors.json').read_text())
    stations, running = [], []
    position = 0
    for i, stop in enumerate(definition['stations']):
        stations.append(dict(id=f'kyiv-lisbon/station/{i}', **stop,
                             position=position, positionStatus='estimated'))
        if i == len(definition['stations']) - 1:
            break
        leg = definition['legs'][i]
        if (leg['fromStation'], leg['toStation']) != (stop['name'], definition['stations'][i+1]['name']):
            raise ValueError('Corridor endpoints must follow station order')
        if sum(z['lengthKm'] for z in leg['runningZones']) != leg['distanceKm']:
            raise ValueError('Running zones must cover the entire leg')
        for zone in leg['runningZones']:
            if zone['lengthKm'] <= 0 or not 0 < zone['speedKmh'] <= 260:
                raise ValueError('Invalid running zone')
            end = position + zone['lengthKm'] * 1000
            running.append((position, end, zone['speedKmh']))
            position = end
    length = position
    sections = []

    # Preserve the twelve local speed zones independently of rail construction.
    zones = [
        (0, 6), (120, 132), (450, 470), (850, 858), (1280, 1296),
        (1720, 1744), (2180, 2192), (2830, 2846), (3300, 3306),
        (3810, 3822), (4230, 4240), (4598, 4610),
    ]

    def section(start, end, block):
        sections.append(dict(id=f'kyiv-lisbon/section/{start}', position=start,
                             length=end-start, block=block,
                             construction='jointed' if block == 'short-25' else 'long-rail',
                             railLengths=build_rails(end-start, block),
                             **({'purpose': 'rail-replacement'} if block == 'short-25' else {})))

    # Preserve the sparse zone lengths while distributing them over the new total.
    zones = [(round(start * length / 4610000), round(start * length / 4610000) + end-start)
             for start, end in zones[:-1]] + [(length / 1000 - 12, length / 1000)]
    # Short-rail impacts occur only at sparse 1–2 km replacement work sites.
    position, long_index = 0, 0
    for work in definition['railReplacementWorks']:
        start = work['positionKm'] * 1000
        end = start + work['lengthKm'] * 1000
        if not 1000 <= end-start <= 2000 or start < position or end > length:
            raise ValueError('Rail replacement works must be ordered, disjoint 1–2 km sites')
        if start > position:
            section(position, start, ('long-800', 'long-1500')[long_index % 2])
            long_index += 1
        section(start, end, 'short-25')
        position = end
    if position < length:
        section(position, length, ('long-800', 'long-1500')[long_index % 2])

    # Local restrictions remain intentional simulation assumptions, independent of
    # railway geography and rail connectors. Running limits come from coarse corridors.
    approach_limits = [(s['position'] / 1000, (40, 50, 60)[i % 3])
                       for i, s in enumerate(stations[1:-1])]
    restrictions = [(0, 1000, 25), (length - 1000, length, 25)]
    restrictions += [((km - 1) * 1000, (km + 1) * 1000, speed)
                     for km, speed in approach_limits]
    restrictions += [(start * 1000, end * 1000, (60, 40, 50)[i % 3])
                     for i, (start, end) in enumerate(zones)]
    bounds = sorted({0, length} | {p for start, end, _ in restrictions + running for p in (start, end)})
    markers = []
    for start, end in zip(bounds, bounds[1:]):
        speed = min([limit for a, b, limit in running + restrictions if a <= start < b])
        if markers and markers[-1]['speedKmh'] == speed:
            markers[-1]['endPosition'] = end
        else:
            markers.append(dict(id=f'kyiv-lisbon/speed/{start}', type='speed_limit',
                                position=start, endPosition=end, speedKmh=speed,
                                status='estimated', basis='simplified-scenario'))
    return dict(id='kyiv-lisbon', name='Kyiv → Lisbon', length=length, synthetic=True,
                contactModel='rail-blocks-v1', speedProfile='simplified-passenger-corridors',
                description=f'{length / 1000:,.0f} km · simplified passenger corridors · approximate limits',
                assumptions='Rounded corridor distances and representative speed zones, not an operational speed chart. Paris transfer, borders and gauge changes are abstracted. Rail construction and local restrictions are synthetic.',
                stations=stations, sections=sections, operatingMarkers=markers)


if __name__ == '__main__':
    output = ROOT / 'public/kyiv-lisbon.json'
    output.write_text(json.dumps(build_route(), ensure_ascii=False, indent=2) + '\n')
    print(f'{output.name}: {output.stat().st_size:,} bytes')
