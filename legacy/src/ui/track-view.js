import { COACH } from '../route/coach-geometry.js';
export function wheelAt(width, height, axles, x, y) {
  const scale = (width - 48) / ((axles.length / 4) * COACH.pitch + 8);
  let nearest = null,
    best = Infinity;
  for (const axle of axles)
    for (const side of ['left', 'right']) {
      const dx = x - (29 + (axle.offset + 5) * scale),
        dy = y - (height * 0.52 + (side === 'left' ? -25 : 25));
      const distance = dx * dx + dy * dy;
      if (Math.abs(dx) <= 6 && Math.abs(dy) <= 9 && distance < best) {
        nearest = { axle, side };
        best = distance;
      }
    }
  return nearest;
}
export function drawTrack(canvas, state, axles, route, mixer, seat = COACH.centre) {
  const width = canvas.clientWidth,
    height = canvas.clientHeight,
    dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, width, height);
  const extent = (axles.length / 4) * COACH.pitch + 8,
    scale = (width - 48) / extent,
    origin = 29,
    y = height * 0.52;
  const xAt = (offset) => origin + (offset + 5) * scale;
  // The train faces left; the track travels to the right under its fixed axles.
  c.lineWidth = 1;
  for (let p = -5; p < extent; p += 1) {
    const x = origin + (p + (((state.position % 1) + 1) % 1)) * scale;
    c.strokeStyle = '#30463e';
    c.beginPath();
    c.moveTo(x, y - 36);
    c.lineTo(x, y + 36);
    c.stroke();
  }
  c.strokeStyle = '#6e8274';
  c.lineWidth = 2;
  for (const dy of [-22, 22]) {
    c.beginPath();
    c.moveTo(10, y + dy);
    c.lineTo(width - 10, y + dy);
    c.stroke();
  }
  for (const e of route.between(Math.max(0, state.position - extent), state.position + 5)) {
    const x = xAt(state.position - e.position);
    c.strokeStyle = e.type === 'joint' ? '#dab58d' : '#688372';
    c.lineWidth = e.type === 'joint' ? 3 : 1;
    const dy = e.side === 'left' ? -22 : 22;
    c.beginPath();
    c.moveTo(x, y + dy - 6);
    c.lineTo(x, y + dy + 6);
    c.stroke();
  }
  const cars = axles.length / 4;
  for (let car = 0; car < cars; car++) {
    const x = xAt(car * COACH.pitch - COACH.couplerOverhang + 0.5),
      w = (COACH.pitch - 1) * scale;
    c.fillStyle = '#213b32';
    c.strokeStyle = '#789a80';
    c.lineWidth = 1;
    c.beginPath();
    c.roundRect(x, y - 29, w, 58, 9);
    c.fill();
    c.stroke();
    c.fillStyle = '#527264';
    for (let i = 0; i < 8; i++) {
      c.fillRect(x + (2 + i * 2.6) * scale, y - 26, 1.6 * scale, 5);
      c.fillRect(x + (2 + i * 2.6) * scale, y + 21, 1.6 * scale, 5);
    }
    c.font = '9px ui-monospace,monospace';
    c.textAlign = 'center';
    c.fillStyle = '#8aa391';
    c.fillText(cars > 3 ? `C${car + 1}` : `CARRIAGE ${car + 1}`, x + w / 2, y - 7);
  }
  for (const axle of axles) {
    const x = xAt(axle.offset);
    c.strokeStyle = '#91b798';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x, y - 23);
    c.lineTo(x, y + 23);
    c.stroke();
    for (const side of ['left', 'right']) {
      const when = mixer?.lastImpacts.get(`${axle.id}:${side}`),
        now = mixer?.context.currentTime ?? 0;
      const flash = when != null && now >= when && now - when < 0.12;
      const dy = side === 'left' ? -25 : 25;
      c.fillStyle = flash ? '#edfbd0' : '#9bbe9d';
      c.shadowColor = '#c6fac0';
      c.shadowBlur = flash ? 18 : 0;
      c.beginPath();
      c.roundRect(x - 4, y + dy - 7, 8, 14, 3);
      c.fill();
      c.shadowBlur = 0;
    }
    c.fillStyle = '#8caa97';
    c.font = '9px ui-monospace,monospace';
    c.textAlign = 'center';
    if (cars <= 3) c.fillText(axle.id.split('-')[1].toUpperCase(), x, y + 55);
  }
  const sx = xAt(seat);
  c.fillStyle = '#e9be83';
  c.beginPath();
  c.arc(sx, y + 9, 4, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#e9be8340';
  c.beginPath();
  c.arc(sx, y + 9, 11, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = '#8caa97';
  c.textAlign = 'left';
  c.font = '10px ui-monospace,monospace';
  c.fillText(`${(state.position / 1000).toFixed(3)} km`, 15, 22);
  c.textAlign = 'right';
  c.fillText('TOP VIEW', width - 15, 22);
}
