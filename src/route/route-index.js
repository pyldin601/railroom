import { COACH } from './coach-geometry.js';
/** Static binary-search index. The audio path never reads the full source-object array. */
export class RouteIndex {
  constructor(data) {
    if (!Number.isFinite(data.length) || data.length <= 0) throw new Error('Invalid route length');
    this.speedMarkers = (data.operatingMarkers || []).filter((m) => m.type === 'speed_limit');
    this.powerMarkers = (data.operatingMarkers || [])
      .filter((m) => ['power_off', 'power_on'].includes(m.type))
      .sort((a, b) => a.position - b.position);
    this.length = data.length;
    this.stations = data.stations || [];
    this.events = data.events || [];
    const ids = new Set();
    let last = -Infinity;
    for (const e of this.events) {
      if (
        !e.id ||
        ids.has(e.id) ||
        !Number.isFinite(e.position) ||
        e.position < 0 ||
        e.position > this.length ||
        e.position < last ||
        !['left', 'right'].includes(e.side) ||
        !['joint', 'weld'].includes(e.type)
      )
        throw new Error('Invalid or unsorted route event');
      ids.add(e.id);
      last = e.position;
    }
  }
  powerAt(position) {
    let on = true;
    for (const m of this.powerMarkers) {
      if (m.position > position + 1e-8) break;
      on = m.type === 'power_on';
    }
    return on;
  }
  nextPower(position) {
    return this.powerMarkers.find((m) => m.position > position + 1e-8)?.position;
  }
  upperBound(p) {
    let lo = 0,
      hi = this.events.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.events[mid].position <= p) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
  between(start, end) {
    const result = [];
    for (
      let i = this.upperBound(start + 1e-8);
      i < this.events.length && this.events[i].position <= end + 1e-8;
      i++
    )
      result.push(this.events[i]);
    return result;
  }
}
export function wheelsets(cars = 1) {
  return Array.from({ length: cars }, (_, car) =>
    COACH.axles.map((offset, i) => ({
      id: `c${car + 1}-a${i + 1}`,
      offset: car * COACH.pitch + offset,
      car: car + 1,
      label: `${car + 1} · ${i + 1}`,
    })),
  ).flat();
}
export function demoRoute(length = 64000) {
  const events = [];
  for (let p = 25; p < length; p += 25)
    for (const side of ['left', 'right'])
      events.push({ id: `demo-${p}-${side}`, position: p, side, type: 'joint' });
  return {
    length,
    stations: [
      { name: 'Jointed track start', position: 0 },
      { name: 'Test track end', position: length },
    ],
    events,
  };
}

/** Front/middle/rear are local to carriage five in the long consist. */
export function listenerSeat(cars, local = COACH.centre) {
  return (Math.min(cars, 5) - 1) * COACH.pitch + local;
}
