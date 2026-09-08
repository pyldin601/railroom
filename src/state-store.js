import { AUDIO_SETTINGS, MIX_LEVELS } from './audio/settings.js';
import { DEFAULT_CARRIAGES, SEAT_POSITIONS } from './route/coach-geometry.js';

export const STORAGE_KEY = 'railroom.state.v1';
const modes = new Set(['route', 'kyiv-lisbon', 'demo', 'demo-12.5']);
const number = (value, fallback, min, max) => Number.isFinite(value)
  ? Math.max(min, Math.min(max, value)) : fallback;
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

/** Persist preferences and location only; audio, velocity and autopilot restart paused. */
function normalize(value) {
  const state = object(value), controls = object(state.controls), audio = object(state.audio);
  const levels = object(audio.levels);
  const validMode = modes.has(state.routeMode);
  return {
    version: 1,
    routeMode: validMode ? state.routeMode : 'route',
    position: validMode || state.routeMode === undefined
      ? number(state.position, 0, 0, Number.MAX_SAFE_INTEGER) : 0,
    cars: [1, 10].includes(state.cars) ? state.cars : DEFAULT_CARRIAGES,
    seatPosition: SEAT_POSITIONS.includes(state.seatPosition) ? state.seatPosition : SEAT_POSITIONS[1],
    controls: {
      throttle: number(controls.throttle, .45, 0, 1),
      brake: number(controls.brake, 0, 0, 1),
      emergency: controls.emergency === true,
    },
    audio: {
      master: number(audio.master, AUDIO_SETTINGS.master, 0, 1),
      motorMode: ['synth', 'recorded'].includes(audio.motorMode) ? audio.motorMode : AUDIO_SETTINGS.motorMode,
      spatial: typeof audio.spatial === 'boolean' ? audio.spatial : AUDIO_SETTINGS.spatial,
      yaw: number(audio.yaw, AUDIO_SETTINGS.yaw, -180, 180),
      levels: Object.fromEntries(Object.entries(MIX_LEVELS).map(([key, fallback]) =>
        [key, number(levels[key], fallback, 0, 1.5)])),
    },
  };
}

export function createStateStore(getStorage = () => localStorage) {
  let lastWritten;
  return {
    load() {
      try {
        const value = JSON.parse(getStorage().getItem(STORAGE_KEY));
        return value?.version === 1 ? normalize(value) : null;
      } catch { return null; }
    },
    save(value) {
      try {
        const serialized = JSON.stringify(normalize(value));
        if (serialized !== lastWritten) {
          getStorage().setItem(STORAGE_KEY, serialized);
          lastWritten = serialized;
        }
        return true;
      } catch { return false; }
    },
  };
}
