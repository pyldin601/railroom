import { from } from 'rxjs';
import type { Track } from '../simulator/types/track';

export const trackItem = (track: Track) => from(track.items);
