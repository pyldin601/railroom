export function drawRouteMap(container, data) {
  container.replaceChildren();
  function marker(position, label, kind, text = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `map-marker ${kind}`;
    button.style.left = `${(position / data.length) * 100}%`;
    button.setAttribute('aria-label', label);
    const glyph = document.createElement('span');
    glyph.className = 'map-glyph';
    glyph.textContent = text;
    glyph.setAttribute('aria-hidden', 'true');
    const tooltip = document.createElement('span');
    tooltip.className = 'map-tooltip';
    tooltip.textContent = label;
    if (position / data.length < 0.12) button.classList.add('near-start');
    if (position / data.length > 0.88) button.classList.add('near-end');
    button.append(glyph, tooltip);
    container.append(button);
    return button;
  }
  for (const station of data.stations || [])
    marker(
      station.position,
      `${station.name} · ${(station.position / 1000).toFixed(2)} km${station.positionStatus === 'estimated' ? ' · approximate position' : ''}`,
      'map-station',
    );
  const elements = data.operatingMarkers || [];
  let speedIndex = 0;
  for (const m of elements) {
    const estimate = m.status === 'estimated' ? ' · estimated' : '';
    if (m.type === 'speed_limit') {
      const button = marker(
        m.position,
        `${m.speedKmh} km/h · ${(m.position / 1000).toFixed(2)}–${(m.endPosition / 1000).toFixed(2)} km${estimate}`,
        'map-speed',
        String(m.speedKmh),
      );
      button.style.setProperty('--marker-row', String(speedIndex++ % 2));
      button.classList.toggle('restricted', m.speedKmh < 120);
    } else if (m.type === 'power_off' || m.type === 'power_on') {
      marker(
        m.position,
        `${m.type === 'power_off' ? 'Power off · coast' : 'Power on · traction available'} · ${(m.position / 1000).toFixed(2)} km${estimate}`,
        `map-power ${m.type}`,
        m.type === 'power_off' ? 'Power off' : 'Power on',
      );
    }
  }
  const head = document.createElement('i');
  head.id = 'route-head';
  head.className = 'route-head';
  head.setAttribute('aria-hidden', 'true');
  container.append(head);
}
