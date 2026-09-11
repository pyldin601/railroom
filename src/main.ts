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
import { SampleBank } from './audio/sample-bank';
import { Scene } from './audio/scene';
import { Mixer } from './audio/mixer';
import { enableAudioOnFirstInteraction } from './audio/audio-context';

async function main() {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) {
    throw new Error('Missing application container');
  }

  const audioContext = new AudioContext();
  enableAudioOnFirstInteraction(audioContext);
  const [{ track, train }, sampleBank] = await Promise.all([
    loadSimulation('./tracks/kyiv-fastiv.json', './trains/generic.json'),
    SampleBank.create(audioContext, new URL('./audio/manifest.json', document.baseURI)),
  ]);
  new Scene(audioContext, sampleBank, new Mixer(audioContext));

  console.log('Track and train ready', { track, train });

  const speed$ = speed(clock$, controlState$, {
    maximumSpeed: metresPerSecond(train.config.maximumSpeed),
  });
  const acceleration$ = acceleration(clock$, speed$);
  const distance$ = position(clock$, speed$, 0);
  const motionLabel$ = motionLabel(speed$, acceleration$, controlState$);

  const trackItem$ = trackItem(track);
  const trainEvent$ = trainEvent(trackItem$, distance$, train.config);

  trainEvent$.subscribe((ev) => {
    console.log(`${ev.cargoId}.${ev.axleIndex}.${ev.atDistance}.${ev.trackObject.type}`);
  });

  render(
    trainTemplate({
      trainConfig: train.config,
      trackLength: track.length,
      controlState$,
      speed$,
      distance$,
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
