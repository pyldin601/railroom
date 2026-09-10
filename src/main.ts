import { render } from 'lit-html';
import { loadSimulation } from './data/load-simulation';
import { trainTemplate } from './ui/template';
import './ui/style.css';
import { controlEvents$, ControlEventType, controlState$ } from './core/controls';
import { speed } from './core/speed';
import { clock$ } from './core/clock';
import { metresPerSecond } from './core/helpers';
import { position } from './core/position';

async function main() {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('Missing application container');

  const { track, train } = await loadSimulation(
    './tracks/kyiv-fastiv.json',
    './trains/generic.json',
  );

  console.log('Track and train ready', { track, train });

  const speed$ = speed(clock$, controlState$, {
    maximumSpeed: metresPerSecond(360),
  });
  const position$ = position(clock$, speed$, 0);

  render(
    trainTemplate({
      controlState$,
      speed$,
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
