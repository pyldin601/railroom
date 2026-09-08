import type { Track } from '../simulator/types/track';
import type { Train } from '../simulator/types/train';
import { loadJson } from './load-json';

/** Load route data and the configuration-only train asset concurrently. */
export async function loadSimulation(trackUrl: string, trainUrl: string) {
  const [track, train] = await Promise.all([
    loadJson<Track>(trackUrl),
    loadJson<Pick<Train, 'config'>>(trainUrl),
  ]);

  return { track, train };
}
