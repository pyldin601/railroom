import { DEFAULT_CARRIAGES, SEAT_POSITIONS } from './route/coach-geometry.js';
import { TrainSession } from './session.js?v=subtle-welds';
import { AUDIO_SETTINGS, MIX_LEVELS } from './audio/settings.js';
import { drawRouteMap } from './ui/route-map.js?v=subtle-welds';
import { createRenderLoop } from './ui/render-loop.js';
import { RouteIndex, demoRoute, wheelsets, listenerSeat } from './route/route-index.js?v=subtle-welds';
import { wheelAt } from './ui/track-view.js?v=wheel-click';
import { renderDashboard } from './ui/dashboard.js?v=subtle-welds';
import { setText } from './ui/dom.js';
import { createStateStore } from './state-store.js';
const stateStore = createStateStore();
const savedState = stateStore.load();
const $ = (id) => document.getElementById(id);
$('cars').value = String(DEFAULT_CARRIAGES);
document.querySelectorAll('[data-seat]').forEach((button, i) => {
  button.dataset.seat = SEAT_POSITIONS[i];
});
// These shared defaults are authoritative; HTML values provide the initial shell.
for (const [kind, level] of Object.entries(MIX_LEVELS)) $(kind + '-mix').value = level * 100;
$('master').value = AUDIO_SETTINGS.master * 100;
$('master-value').textContent = $('master').value + '%';
$('motor-mode').value = AUDIO_SETTINGS.motorMode;
$('spatial').checked = AUDIO_SETTINGS.spatial;
$('yaw').value = AUDIO_SETTINGS.yaw;
$('yaw-value').textContent = AUDIO_SETTINGS.yaw + '°';
let requestRender = () => {};
const session = new TrainSession();
let routeData,
  route,
  axles = wheelsets(Number($('cars').value)),
  seat = listenerSeat(Number($('cars').value)),
  loading = false,
  ready = false;
let emergency = false;
let activeRouteMode = null;
const controls = () => ({
  throttle: Number($('throttle').value) / 100,
  brake: Number($('brake').value) / 100,
  emergency,
});
function error(message) {
  $('error').textContent = message;
  $('error').hidden = !message;
}
function setStatus(text) {
  setText('status', text);
  requestRender();
}
const demoSpacing = () => ({ demo: 25, 'demo-12.5': 12.5 })[$('route-mode').value];
function displayRoute() {
  drawRouteMap(
    $('route-map'),
    demoSpacing()
      ? { length: route.length, stations: route.stations } : routeData,
  );
  $('route-assumptions').hidden = Boolean(demoSpacing()) || routeData.speedProfile !== 'simplified-passenger-corridors';
  $('station').replaceChildren();
  for (const s of route.stations) {
    const option = document.createElement('option');
    option.value = s.position;
    option.textContent = `${s.name}${s.dwellSeconds ? ` · ${s.dwellSeconds / 60} min stop` : ''}`;
    $('station').append(option);
  }
  $('route-title').textContent = demoSpacing() ? `${demoSpacing()} m jointed test track` : routeData.name;
  $('route-caption').textContent = demoSpacing()
    ? `${demoSpacing()} m jointed test track · synthetic test track`
    : routeData.description;
}
function audioOptions(position = 0) {
  return {
    route,
    axles,
    position,
    controls: controls(),
    settings: {
      master: Number($('master').value) / 100,
      motorMode: $('motor-mode').value,
      seat,
      yaw: Number($('yaw').value),
      spatial: $('spatial').checked,
      levels: Object.fromEntries(
        Object.keys(MIX_LEVELS).map((kind) => [kind, Number($(kind + '-mix').value) / 100]),
      ),
    },
  };
}
function buildAudio(position = 0) {
  session.configure(audioOptions(position));
}
async function enableAudio() {
  if (session.bank) return;
  if (loading) throw new Error('Audio is still loading');
  loading = true;
  $('play').disabled = true;
  setStatus('Loading recorded sounds');
  try {
    await session.enable(() => audioOptions(pendingPosition));
    updateSoundNote();
  } finally {
    loading = false;
    $('play').disabled = !ready;
  }
}
async function play(audition = false) {
  if (loading || !ready) return;
  const generation = routeGeneration;
  try {
    error('');
    await enableAudio();
    await session.context.resume();
    if (!ready || generation !== routeGeneration) return;
    if (audition) {
      session.transport.pause();
      if (!demoSpacing()) $('route-mode').value = 'demo';
      route = new RouteIndex(demoRoute(64000, demoSpacing()));
      activeRouteMode = $('route-mode').value;
      pendingPosition = 0;
      displayRoute();
      buildAudio();
      session.transport.state.speed = 20;
      $('throttle').value = 0;
      $('brake').value = 0;
      emergency = false;
      updateControls();
    } else if (session.transport.running) {
      session.transport.pause();
      setStatus('Paused');
      return;
    }
    session.start();
    setStatus('Running');
  } catch (e) {
    error(e.message);
    setStatus('Audio unavailable');
  }
}
function disableAutopilot() {
  if (session.transport?.autopilot) {
    session.transport.setAutopilot(false);
    $('throttle').value = 0;
    $('brake').value = 0;
  }
  $('autopilot').setAttribute('aria-pressed', 'false');
  $('autopilot-status').hidden = true;
}
async function toggleAutopilot() {
  if (loading || !ready) return;
  const generation = routeGeneration;
  if (session.transport?.autopilot) {
    disableAutopilot();
    updateControls();
    return;
  }
  try {
    await enableAudio();
    await session.context.resume();
    if (!ready || generation !== routeGeneration) return;
    emergency = false;
    session.transport.setAutopilot(true);
    $('autopilot').setAttribute('aria-pressed', 'true');
    $('autopilot-status').hidden = false;
    if (!session.transport.running) {
      session.start();
    }
    setStatus('Autopilot');
  } catch (e) {
    error(e.message);
  }
}
$('autopilot').onclick = toggleAutopilot;
for (const id of ['throttle', 'brake']) {
  $(id).addEventListener('pointerdown', () => {
    disableAutopilot();
    updateControls();
  });
  $(id).addEventListener('keydown', () => disableAutopilot());
  $(id).addEventListener('input', () => {
    if (session.transport?.autopilot) {
      const value = $(id).value;
      disableAutopilot();
      $(id).value = value;
    }
  });
}
for (const id of ['coast', 'emergency', 'reset', 'seek', 'audition'])
  $(id).addEventListener('click', disableAutopilot);
for (const id of ['route-mode', 'cars']) $(id).addEventListener('change', disableAutopilot);
function updateControls() {
  $('throttle-value').textContent = $('throttle').value + '%';
  $('brake-value').textContent = $('brake').value + '%';
  $('emergency').classList.toggle('active', emergency);
  $('emergency').setAttribute('aria-pressed', String(emergency));
  session.transport?.updateControls(controls());
}
async function soundHorn() {
  if (!ready || loading) return;
  try {
    error('');
    await enableAudio();
    await session.context.resume();
    session.mixer.horn(session.context.currentTime, session.transport.generation);
    if (!session.transport.running) setStatus('Ready');
    requestRender();
  } catch (e) {
    error(e.message);
  }
}
$('horn').onclick = soundHorn;
async function auditionWheel(event) {
  if (!ready || loading) return;
  const canvas = $('track'),
    rect = canvas.getBoundingClientRect();
  const hit = wheelAt(
    canvas.clientWidth,
    canvas.clientHeight,
    axles,
    ((event.clientX - rect.left) * canvas.clientWidth) / rect.width,
    ((event.clientY - rect.top) * canvas.clientHeight) / rect.height,
  );
  if (!hit) return;
  try {
    error('');
    await enableAudio();
    await session.context.resume();
    if (!axles.some((a) => a.id === hit.axle.id)) return;
    const state = session.transport.snapshot();
    session.mixer.hit(
      {
        kind: 'joint',
        wheelsetId: hit.axle.id,
        side: hit.side,
        offset: hit.axle.offset,
        position: state.position,
        objectId: `audition-${hit.axle.id}-${hit.side}`,
        speedMps: state.speed > 0 ? state.speed : 20,
      },
      session.context.currentTime + 0.015,
      session.transport.generation,
    );
    requestRender();
    setTimeout(requestRender, 30);
    setTimeout(requestRender, 160);
  } catch (e) {
    error(e.message);
  }
}
$('track').onclick = auditionWheel;
$('play').onclick = () => play();
$('audition').onclick = () => play(true);
$('throttle').oninput = () => {
  emergency = false;
  updateControls();
};
$('brake').oninput = () => {
  emergency = false;
  updateControls();
};
function coast() {
  $('throttle').value = 0;
  $('brake').value = 0;
  emergency = false;
  updateControls();
}
$('coast').onclick = coast;
function toggleEmergency() {
  emergency = !emergency;
  if (emergency) {
    $('throttle').value = 0;
    $('brake').value = 100;
  }
  updateControls();
}
$('emergency').onclick = toggleEmergency;
function resetJourney() {
  pendingPosition = 0;
  session.transport?.seek(0);
  emergency = false;
  $('brake').value = 0;
  updateControls();
  setStatus('Ready');
}
$('reset').onclick = resetJourney;
function seekStation() {
  if (!ready) return;
  session.transport?.seek(Number($('station').value));
  if (!session.transport) {
    pendingPosition = Number($('station').value);
  }
  setStatus('Ready at station');
}
$('seek').onclick = seekStation;
let pendingPosition = 0;
let routeGeneration = 0;
function setRouteReady(value) {
  ready = value;
  for (const id of ['play', 'autopilot', 'audition', 'seek', 'station'])
    $(id).disabled = !value;
}
async function changeRoute(restore = null) {
  persistState();
  if (restore) pendingPosition = restore.position;
  const generation = ++routeGeneration;
  session.transport?.pause();
  disableAutopilot();
  setRouteReady(false);
  error('');
  setStatus('Loading route');
  const mode = $('route-mode').value;
  try {
    let data;
    const spacing = demoSpacing();
    if (spacing) data = demoRoute(64000, spacing);
    else {
      const response = await fetch(mode === 'kyiv-lisbon' ? './public/kyiv-lisbon.json' : './public/route.json');
      if (!response.ok) throw new Error('Route asset could not be loaded');
      data = await response.json();
      if (mode === 'route') data = {
        ...data, name: 'Kyiv → Fastiv',
        description: '64 km · 12.5 / 25 m rails / welded strings ≤800 m · approximate route',
      };
    }
    if (generation !== routeGeneration) return;
    const nextRoute = new RouteIndex(data);
    routeData = data;
    route = nextRoute;
    activeRouteMode = mode;
    pendingPosition = Math.max(0, Math.min(route.length, restore ? pendingPosition : 0));
    if (!restore) {
      emergency = false;
      $('brake').value = 0;
    }
    updateControls();
    displayRoute();
    if (session.bank) buildAudio(pendingPosition);
    setRouteReady(true);
    persistState();
    setStatus('Ready · headphones recommended');
  } catch (e) {
    if (generation !== routeGeneration) return;
    error(`${e.message}. Select a track to retry.`);
    setStatus('Route unavailable');
  }
}
$('route-mode').onchange = () => changeRoute();
function changeConsist() {
  const position = session.transport?.snapshot().position ?? pendingPosition;
  session.transport?.pause();
  axles = wheelsets(Number($('cars').value));
  seat = listenerSeat(axles.length / 4, Number($('seats').querySelector('.selected').dataset.seat));
  $('seat-label').textContent =
    `Seat position · carriage ${Math.min(axles.length / 4, 5)} of ${axles.length / 4}`;
  if (session.bank) buildAudio(position);
  setStatus('Ready');
}
$('cars').onchange = changeConsist;
$('master').oninput = () => {
  $('master-value').textContent = $('master').value + '%';
  if (session.mixer)
    session.mixer.master.gain.setTargetAtTime(
      Number($('master').value) / 100,
      session.context.currentTime,
      0.03,
    );
};
$('yaw').oninput = () => {
  $('yaw-value').textContent = $('yaw').value + '°';
  session.mixer?.setListener(seat, Number($('yaw').value));
};
for (const button of $('seats').children)
  button.onclick = () => {
    seat = listenerSeat(axles.length / 4, Number(button.dataset.seat));
    for (const b of $('seats').children) {
      b.classList.toggle('selected', b === button);
      b.setAttribute('aria-pressed', String(b === button));
    }
    session.mixer?.setListener(seat, Number($('yaw').value));
  };
function updateSoundNote() {
  $('sound-note').textContent =
    $('motor-mode').value === 'recorded'
      ? 'Recorded motor tone · pitch follows speed'
      : 'Live motor synthesis · recorded wheel impacts, rolling and braking';
}
function changeMotorMode() {
  session.engine?.setMotorMode($('motor-mode').value);
  updateSoundNote();
}
$('motor-mode').onchange = changeMotorMode;
$('spatial').onchange = () => session.mixer?.setSpatial($('spatial').checked);
for (const kind of Object.keys(MIX_LEVELS))
  $(kind + '-mix').oninput = () => {
    if (session.mixer) session.mixer.levels[kind] = Number($(kind + '-mix').value) / 100;
  };
document.addEventListener('keydown', (e) => {
  if (['INPUT', 'SELECT', 'BUTTON', 'SUMMARY', 'TEXTAREA'].includes(e.target.tagName)) return;
  if (e.code === 'KeyH' && !e.repeat) {
    e.preventDefault();
    soundHorn();
  }
  if (e.code === 'Space') {
    e.preventDefault();
    play();
  }
  if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
    e.preventDefault();
    disableAutopilot();
    $('throttle').value = Math.max(
      0,
      Math.min(100, Number($('throttle').value) + (e.code === 'ArrowUp' ? 5 : -5)),
    );
    updateControls();
  }
  if (e.code === 'KeyB') {
    disableAutopilot();
    $('brake').value = Math.min(100, Number($('brake').value) + 10);
    updateControls();
  }
});
setInterval(() => {
  const interruption = session.tick();
  if (interruption) setStatus(`Paused · ${interruption}`);
}, 25);
function render() {
  return renderDashboard({
    route,
    transport: session.transport,
    mixer: session.mixer,
    context: session.context,
    pendingPosition,
    axles,
    seat,
    emergency,
  });
}
requestRender = createRenderLoop(render);
for (const event of ['input', 'change', 'click'])
  document.addEventListener(event, () => {
    requestRender();
    setTimeout(requestRender, 160);
  });
document.addEventListener('visibilitychange', requestRender);
document.addEventListener('keydown', requestRender);
new ResizeObserver(requestRender).observe($('track'));
requestRender();

function persistState() {
  // A pending/failed selection must never pair its route name with old progress.
  if (!ready || !activeRouteMode) return;
  const position = session.transport?.snapshot().position ?? pendingPosition;
  stateStore.save({
    routeMode: activeRouteMode,
    position,
    controls: controls(),
    cars: Number($('cars').value),
    seatPosition: Number($('seats').querySelector('.selected').dataset.seat),
    audio: audioOptions(position).settings,
  });
}
function restorePreferences(state) {
  $('route-mode').value = state.routeMode;
  $('cars').value = String(state.cars);
  for (const button of $('seats').children) {
    const selected = Number(button.dataset.seat) === state.seatPosition;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
  axles = wheelsets(state.cars);
  seat = listenerSeat(state.cars, state.seatPosition);
  $('seat-label').textContent = `Seat position · carriage ${Math.min(state.cars, 5)} of ${state.cars}`;
  $('throttle').value = state.controls.throttle * 100;
  $('brake').value = state.controls.brake * 100;
  emergency = state.controls.emergency;
  $('master').value = state.audio.master * 100;
  $('master-value').textContent = $('master').value + '%';
  $('motor-mode').value = state.audio.motorMode;
  $('spatial').checked = state.audio.spatial;
  $('yaw').value = state.audio.yaw;
  $('yaw-value').textContent = $('yaw').value + '°';
  for (const [kind, level] of Object.entries(state.audio.levels)) $(kind + '-mix').value = level * 100;
  updateControls();
  updateSoundNote();
}
// Save only basic state, not prediction queues, live velocity, audio or autopilot.
// Event saves are deferred until the action's own handlers have finished.
for (const event of ['input', 'change', 'click', 'keydown'])
  document.addEventListener(event, () => queueMicrotask(persistState));
setInterval(persistState, 1000);
window.addEventListener('pagehide', persistState);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) persistState();
});
if (savedState) restorePreferences(savedState);
void changeRoute(savedState);
