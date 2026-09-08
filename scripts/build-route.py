"""Build a deterministic mixed-track variant; preserve the original asset inventory."""
from operating_markers import build_markers
import json
import math
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

APP = Path(__file__).resolve().parents[1]
ROOT = APP


def identity(kind, *parts):
    return str(uuid5(NAMESPACE_URL, 'railroom/kyiv-fastiv/mixed-v1/' +
                     '/'.join(map(str, (kind, *parts)))))


def build_route(objects):
    stations = [{k: o[k] for k in ('id', 'name', 'position')}
                for o in objects if o['type'] == 'station']
    # Stop names/order checked against the local 2026 all-stops timetable.
    # Preserve existing anchors; added distances are illustrative, not chainage.
    extra_stops = [
        ('Tarasivka', 19000.0), ('Maliutynka', 26000.0),
        ('Shliakhova', 28000.0), ('Hlevakha', 30000.0),
        ('Danylivka (888 km)', 32500.0), ('Korchi', 41000.0),
        ('Bilky', 49500.0), ('Pivni', 52500.0), ('Vyshniaky', 55000.0),
        ('Sorochyi Brid', 58000.0), ('Snitynka', 61000.0),
    ]
    stations += [dict(id=identity('stop', name), name=name, position=position)
                 for name, position in extra_stops]
    for station in stations:
        station['positionStatus'] = 'estimated'
        station['sourceUrl'] = 'https://boyarka-shop.in.ua/ukr/train2s/6/1/'
    stations.sort(key=lambda station: station['position'])
    # Deliberate illustrative renewal pattern, NOT observed infrastructure.
    # Small passenger stops do not automatically interrupt welded running rails.
    plan = [
        (0, 1500, 25, 'Kyiv-Pasazhyrskyi departure approach'),
        (1500, 6250, None, 'Running track through Karavaievi Dachi'),
        (6250, 7750, 25, 'Kyiv-Volynskyi approach'),
        (7750, 14000, None, 'Renewed running track'),
        (14000, 17000, 25, 'Illustrative older jointed running section'),
        (17000, 23250, None, 'Renewed running track toward Boiarka'),
        (23250, 25250, 25, 'Illustrative jointed section near Boiarka'),
        (25250, 34250, None, 'Renewed running track'),
        (34250, 35750, 25, 'Vasylkiv I approach'),
        (35750, 42000, None, 'Renewed running track'),
        (42000, 45000, 25, 'Illustrative older jointed running section'),
        (45000, 51250, None, 'Renewed running track through Motovylivka'),
        (51250, 53250, 25, 'Illustrative jointed section near Pivni'),
        (53250, 60500, None, 'Renewed running track'),
        (60500, 62500, 25, 'Illustrative jointed section near Snitynka'),
        (62500, 64000, 25, 'Fastiv I arrival approach'),
    ]
    sections, spans = [], []
    for start, end, rail_length, reason in plan:
        construction = 'jointed' if rail_length else 'welded'
        section_id = identity('section', start, end)
        sections.append(dict(id=section_id, type='section', position=float(start),
                             length=float(end-start), construction=construction, reason=reason))
        if construction == 'jointed':
            assert (end-start) % rail_length == 0
            # Work in half-rail units. Feasible remainders preserve exact
            # section ends without adding a third short rail or a long gap.
            units = int((end-start)/12.5)
            feasible = set(range(2, 21, 2))
            for remaining in range(2, units + 1):
                if any(remaining - 2 * full - short in feasible
                       for full in range(5, 11) for short in (1, 2)):
                    feasible.add(remaining)
            lengths, cycle = [], 0
            gaps = (5, 8, 6, 10, 7, 9)
            while units > 20 or units % 2:
                candidates = [(gaps[(cycle + shift) % len(gaps)], short)
                              for shift in range(len(gaps))
                              for short in (1 + cycle % 2, 2 - cycle % 2)]
                full, short = next((full, short) for full, short in candidates
                                  if units - 2 * full - short in feasible)
                lengths += [25] * full + [12.5] * short
                units -= 2 * full + short
                cycle += 1
            lengths += [25] * (units // 2)
            sizes = [(length, 'jointed', reason) for length in lengths]
        else:
            # Direct string-to-string joints. Balance lengths on the 25 m
            # fabrication grid, keeping each string at most 800 m.
            count = math.ceil((end-start)/800)
            units = (end-start)//25
            base, extra = divmod(units, count)
            sizes = []
            for i in range(count):
                sizes.append(((base+(i < extra))*25, 'welded', 'welded string'))
        position = start
        for length, kind, purpose in sizes:
            spans.append(dict(position=float(position), length=float(length),
                              construction=kind, purpose=purpose, sectionId=section_id))
            position += length
        assert position == end
    rails = [dict(id=identity('rail', int(s['position']) if s['position'].is_integer() else s['position'], side), type='rail', side=side,
                  fabricationLength=s['length'] if s['construction'] == 'jointed' else 25.0, **s)
             for s in spans for side in ('left', 'right')]
    boundaries = {s['position'] for s in spans[1:]}
    # Retain original event UUIDs/positions. Their connection type now follows
    # the physical string ends; seams inside each string remain quiet welds.
    welded_sections = [section for section in sections if section['construction'] == 'welded']
    events = [dict(id=o['id'], position=o['position'], side=o['side'],
                   type='joint' if o['position'] in boundaries else 'weld')
              for o in objects if o['type'] in ('joint', 'weld')
              and (o['position'] in boundaries or any(
                  section['position'] < o['position'] < section['position'] + section['length']
                  for section in welded_sections))]
    existing = {(e['position'], e['side']) for e in events}
    for position in sorted(boundaries):
        for side in ('left', 'right'):
            if (position, side) not in existing:
                events.append(dict(id=identity('joint', position, side),
                                   position=position, side=side, type='joint'))
    events.sort(key=lambda event: (event['position'], event['side']))
    assert len(stations) == 19
    assert all(a['position'] <= b['position'] for a, b in zip(events, events[1:]))
    return dict(length=64000.0, synthetic=True, layout='mixed-25m-interspersed-short-rails-v5',
                stations=stations, sections=sections, rails=rails, events=events,
                operatingMarkers=build_markers(sections),
                operatingMetadata=dict(schemaVersion=1, researchedOn='2026-09-07',
                    operationallyVerified=False, dataOnly=False, speedLimitsEnforced=False,
                    coordinateSystem='meters from synthetic Kyiv-Pasazhyrskyi origin; not railway chainage',
                    sources=[dict(id='boiarka-2020', url='https://explorer.lviv.ua/forum/index.php?topic=8599.0',
                        sourceDate='2020-08-14', kind='firsthand-public-report',
                        supports='Reported presence near station throat only; no surveyed positions or current confirmation')]))


if __name__ == '__main__':
    data = build_route(json.loads((ROOT/'data/railway/kyiv-fastiv/objects.json').read_text()))
    out = APP/'public/route.json'
    out.write_text(json.dumps(data, separators=(',', ':'))+'\n')
    print(f"{len(data['events'])} contacts, {len(data['rails'])} rail spans, "
          f"{len(data['stations'])} stations, {out.stat().st_size:,} bytes")
