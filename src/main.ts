import { render } from 'lit-html';
import { loadSimulation } from './data/load-simulation';
import { trainTemplate } from './ui/template';
import './ui/style.css';
import { controlEvents$, ControlEventType, controlState$ } from './core/controls';
import { speed } from './core/speed';
import { clock$ } from './core/clock';
import { metresPerSecond } from './core/helpers';
import { position } from './core/position';
import { motionLabel } from './core/motion-label';
import { acceleration } from './core/acceleration';
import { trackItem } from './core/track-item';
import { trainEvent } from './core/train-event';

async function main() {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('Missing application container');

  const { track, train } = await loadSimulation(
    './tracks/kyiv-fastiv.json',
    './trains/generic.json',
  );

  console.log('Track and train ready', { track, train });

  const speed$ = speed(clock$, controlState$, {
    maximumSpeed: metresPerSecond(train.config.maximumSpeed),
  });
  const acceleration$ = acceleration(clock$, speed$);
  const position$ = position(clock$, speed$, 0);
  const motionLabel$ = motionLabel(speed$, acceleration$, controlState$);

  const trackItem$ = trackItem(track);
  const trainEvent$ = trainEvent(trackItem$, position$, train.config);

  trainEvent$.subscribe((ev) => {
    console.log(`${ev.cargoId}.${ev.axleIndex}.${ev.distance}.${ev.item.object.type}`);
  });

  render(
    trainTemplate({
      trainConfig: train.config,
      trackLength: track.length,
      controlState$,
      speed$,
      position$,
      motionLabel$,
      onAccelerationChange(level) {
        controlEvents$.next({ type: ControlEventType.AccelerateChange, value: level });
      },
      onBrakeChange(level) {
        controlEvents$.next({ type: ControlEventType.BrakeChange, value: level });
      },
    }),
    app,
  );
}

main().catch((error: unknown) => {
  console.error('Failed to start simulation', error);
});
