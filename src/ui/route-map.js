const maps = new WeakMap();
const MAX_WINDOW = 1_000_000;

export function routeWindow(routeLength, position) {
  const length = Math.min(routeLength, MAX_WINDOW);
  const train = Math.max(0, Math.min(routeLength, position));
  const start = Math.max(0, Math.min(routeLength - length, train - length / 2));
  return { start, end: start + length, length, head: (train - start) / length * 100 };
}

/** Move existing markers rather than rebuilding focused buttons on every frame. */
export function updateRouteMap(container, position) {
  const map = maps.get(container);
  if (!map) return;
  const window = routeWindow(map.length, position);
  const width = container.clientWidth;
  const speedRows = [];
  container.dataset.windowStart = String(window.start);
  container.dataset.windowEnd = String(window.end);
  map.head.style.left = `${window.head}%`;
  for (const item of map.markers) {
    // A speed section that began offscreen still applies at the window's left edge.
    const carried = item.endPosition != null && item.position < window.start && item.endPosition > window.start;
    item.button.hidden = item.span
      ? item.endPosition <= window.start || item.position >= window.end
      : !carried && (item.position < window.start || item.position > window.end);
    if (item.button.hidden) continue;
    const percent = (Math.max(window.start, item.position) - window.start) / window.length * 100;
    item.button.style.left = `${percent}%`;
    if (map.zones.length && item.speed) {
      const centre = percent / 100 * width;
      let row = speedRows.findIndex(end => centre - 15 >= end + 4);
      if (row === -1) row = speedRows.length;
      speedRows[row] = centre + 15;
      item.button.style.setProperty('--marker-row', String(row));
    }
    if (item.span) item.button.style.width = `${(Math.min(item.endPosition, window.end) - Math.max(item.position, window.start)) / window.length * 100}%`;
    item.button.classList.toggle('near-start', percent < 12);
    item.button.classList.toggle('near-end', percent > 88);
  }
  if (map.zones.length) {
    const top = 30 + Math.max(2, speedRows.length) * 29 + 12;
    for (const zone of map.zones) zone.button.style.top = `${top}px`;
    container.style.height = `${Math.max(150, top + 40)}px`;
  }
  for (const [label, value] of [[map.startLabel, window.start], [map.endLabel, window.end]]) {
    const text = `${(value / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })} km`;
    if (label.textContent !== text) label.textContent = text;
  }
}

export function drawRouteMap(container, data) {
  container.replaceChildren();
  container.style.height = '';
  const markers = [];
  function marker(position, label, kind, text = '', endPosition, span = false) {
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
    markers.push({ button, position, endPosition, span, speed: kind === 'map-speed' });
    return button;
  }
  for (const station of data.stations || [])
    marker(
      station.position,
      `${station.name} · ${(station.position / 1000).toFixed(2)} km${station.positionStatus === 'estimated' ? ' · approximate position' : ''}`,
      'map-station',
    );
  if (data.contactModel) {
    for (const section of data.sections || []) {
      const sizes = [...new Set(section.railPattern || [25, 25, 25, 25, 25, 25, 25, 12.5])].sort((a, b) => a - b);
      const welded = section.construction === 'welded';
      let kind = welded ? 'welded' : sizes.length > 1 ? 'mixed' : sizes[0] === 12.5 ? 'short' : 'standard';
      let name = welded ? 'Welded track' : `${sizes.join(' / ')} m rails`;
      if (section.block === 'short-25') {
        kind = 'mixed';
        name = `${section.purpose === 'rail-replacement' ? 'Rail replacement works · ' : ''}25 m rails + 12.5 m inserts`;
      } else if (section.block === 'long-800') {
        kind = 'long800';
        name = '800 m rails · occasional 12.5 m connectors';
      } else if (section.block === 'long-1500') {
        kind = 'long1500';
        name = '1,500 m rails · direct joins';
      }
      marker(section.position,
        `${name} · ${section.position / 1000}–${(section.position + section.length) / 1000} km · ${section.length / 1000} km zone`,
        `map-track-zone zone-${kind}`, '', section.position + section.length, true);
    }
  }
  const elements = data.operatingMarkers || [];
  let speedIndex = 0;
  for (const m of elements) {
    const estimate = m.basis === 'simplified-scenario' ? ' · representative scenario limit' : m.status === 'estimated' ? ' · estimated' : '';
    if (m.type === 'speed_limit') {
      const button = marker(
        m.position,
        `${m.speedKmh} km/h · ${(m.position / 1000).toFixed(2)}–${(m.endPosition / 1000).toFixed(2)} km${estimate}`,
        'map-speed',
        String(m.speedKmh),
        m.endPosition,
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
  const range = document.createElement('div');
  range.className = 'map-window-range';
  const startLabel = document.createElement('span');
  const endLabel = document.createElement('span');
  range.append(startLabel, endLabel);
  container.append(range);
  maps.set(container, { length: data.length, markers, head, startLabel, endLabel,
    zones: markers.filter(item => item.span) });
  updateRouteMap(container, 0);
}
