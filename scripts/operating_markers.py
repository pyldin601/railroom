"""Data-only operating elements for the illustrative route; no verified local limits."""
from uuid import NAMESPACE_URL, uuid5

def build_markers(sections):
    markers = []
    for section in sections:
        start = section['position']
        # Only welded strings receive the full route speed in this scenario.
        limit = (120 if section['construction'] == 'welded' else
                 25 if start in (0, 62500) else 40)
        markers.append(dict(
            id=str(uuid5(NAMESPACE_URL, f'railroom/kyiv-fastiv/marker/speed/{start}')),
            type='speed_limit', position=float(start), speedKmh=float(limit),
            endPosition=float(start+section['length']), sectionId=section['id'],
            direction='kyiv-to-fastiv', appliesTo='passenger',
            status='estimated', positionStatus='synthetic-route-coordinate',
            basis='scenario-assumption', verifiedSpeedKmh=None,
            reason='User-selected scenario: jointed rails limited to 40 km/h, terminal approaches to 25 km/h, welded strings to 120 km/h.',
            sourceIds=[]))
    # Deliberately not a surveyed chainage or asserted length of the real neutral section.
    for kind, position, label in [
        ('power_off', 23500.0, 'Вимкнути струм'),
        ('power_on', 23800.0, 'Увімкнути струм на електровозі'),
    ]:
        markers.append(dict(
            id=str(uuid5(NAMESPACE_URL, f'railroom/kyiv-fastiv/marker/boiarka/{kind}')),
            type=kind, position=position, label=label, direction='kyiv-to-fastiv',
            appliesTo='locomotive', groupId='boiarka-neutral-section',
            status='estimated', positionStatus='synthetic-route-coordinate',
            basis='reported-feature-estimated-placement', sourceIds=['boiarka-2020'],
            reason='Neutral section reported near Boiarka station throat; direction, exact sign positions and present state unverified. Power-off/on signs, not pantograph-lowering commands.'))
    return sorted(markers, key=lambda marker: marker['position'])
