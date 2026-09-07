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
        (0, 1500, 'jointed', 'Kyiv-Pasazhyrskyi departure approach; assumed older jointed track'),
        (1500, 6250, 'welded', 'Continuous running section through Karavaievi Dachi'),
        (6250, 7750, 'jointed', 'Kyiv-Volynskyi station approach; assumed jointed zone'),
        (7750, 34250, 'welded', 'Renewed running track through Vyshneve and Boiarka'),
        (34250, 35750, 'jointed', 'Vasylkiv I station approach; assumed jointed zone'),
        (35750, 62500, 'welded', 'Renewed running track through Motovylivka'),
        (62500, 64000, 'jointed', 'Fastiv I arrival approach; assumed older jointed track'),
    ]
    sections, spans = [], []
    for start, end, construction, reason in plan:
        section_id = identity('section', start, end)
        sections.append(dict(id=section_id, type='section', position=float(start),
                             length=float(end-start), construction=construction, reason=reason))
        if construction == 'jointed':
            sizes = [(25, 'jointed', 'station approach')] * ((end-start)//25)
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
    rails = [dict(id=identity('rail', int(s['position']), side), type='rail', side=side,
                  fabricationLength=25.0, **s)
             for s in spans for side in ('left', 'right')]
    boundaries = {s['position'] for s in spans[1:]}
    # Retain original event UUIDs/positions. Their connection type now follows
    # the physical string ends; seams inside each string remain quiet welds.
    events = [dict(id=o['id'], position=o['position'], side=o['side'],
                   type='joint' if o['position'] in boundaries else 'weld')
              for o in objects if o['type'] in ('joint', 'weld')]
    assert len(events) == 5118 and len(stations) == 19
    assert all(a['position'] <= b['position'] for a, b in zip(events, events[1:]))
    return dict(length=64000.0, synthetic=True, layout='mixed-25m-800m-direct-joints-v2',
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
