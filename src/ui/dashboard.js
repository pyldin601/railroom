import { updateRouteMap } from './route-map.js?v=rail-blocks';
import { DEFAULT_VEHICLE } from '../simulation/motion.js?v=speed260';
import { MAX_IMPACT_VOICES } from '../audio/spatial-mixer.js?v=review-fixes';
import { drawTrack } from './track-view.js?v=wheel-click';
import { setText } from './dom.js';
const $ = (id) => document.getElementById(id);

export function renderDashboard({
  route,
  transport,
  mixer,
  context,
  pendingPosition,
  axles,
  seat,
  emergency,
}) {
  if (route) {
    const state = transport?.snapshot() || {
      position: pendingPosition,
      speed: 0,
      acceleration: 0,
    };
    const running = !!transport?.running;
    if (transport?.autopilot) {
      const c = transport.controls;
      $('throttle').value = Math.round(c.throttle * 100);
      $('brake').value = Math.round(c.brake * 100);
      setText('throttle-value', $('throttle').value + '%');
      setText('brake-value', $('brake').value + '%');
      setText('autopilot-status', transport.autopilot.status);
    }
    if (state.air)
      setText(
        'air-status',
        `Brake cylinders ${state.air.cylinder.toFixed(1)} bar · air ${state.air.reservoir.toFixed(1)} bar${state.air.compressor ? ' · compressor on' : ''}`,
      );
    setText('speed', Math.round(state.speed * 3.6));
    $('speed-bar').style.width = `${Math.min(1, state.speed / DEFAULT_VEHICLE.maxSpeed) * 100}%`;
    setText(
      'distance',
      `${(state.position / 1000).toFixed(3)} / ${(route.length / 1000).toFixed(3)} km`,
    );
    updateRouteMap($('route-map'), state.position);
    const next = route.stations.find((s) => s.position > state.position + 0.1);
    setText('next-station', next?.name || 'End of route');
    setText(
      'next-distance',
      next ? `${((next.position - state.position) / 1000).toFixed(2)} km` : 'Arrived',
    );
    setText(
      'play-label',
      running
        ? 'Pause journey'
        : state.position || state.speed
          ? 'Resume journey'
          : 'Start journey',
    );
    setText('play-icon', running ? 'Ⅱ' : '▶');
    $('status-dot').classList.toggle('running', running);
    setText(
      'motion-label',
      !running
        ? 'PAUSED'
        : state.position >= route.length
          ? 'END OF ROUTE'
          : state.speed < 0.05
            ? 'STATIONARY'
            : emergency
              ? 'EMERGENCY'
              : Number($('brake').value) > 0
                ? 'BRAKING'
                : state.acceleration > 0.01
                  ? 'ACCELERATING'
                  : 'COASTING',
    );
    drawTrack($('track'), state, axles, route, mixer, seat);
    if (mixer) {
      const peak = mixer.peak();
      $('meter').style.width = `${Math.min(100, peak * 100)}%`;
      setText('peak', peak > 1e-6 ? `${(20 * Math.log10(peak)).toFixed(1)} dB` : '−∞ dB');
      $('meter').style.background = peak > 0.9 ? 'var(--red)' : 'var(--mint)';
      setText(
        'diagnostics',
        `${context.sampleRate} Hz · ${mixer.voices.size}/${MAX_IMPACT_VOICES} impact voices · ${axles.length} wheelsets · ${transport.underruns} scheduling interruptions · ${Math.round((context.baseLatency || 0) * 1000)} ms base latency · ${route.contactCount} route contacts`,
      );
    }
  }
  return !!transport?.running;
}
