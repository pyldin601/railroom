import type { Observable, Subscription } from 'rxjs';
import type { Mixer } from './mixer';
import { Rolling } from './rolling.ts';
import type { SampleBank } from './sample-bank';

/** Owns the mixer and the train's sound sources. */
export class Scene {
  readonly mixer: Pick<Mixer, 'inputs' | 'dispose'>;
  readonly rolling: Rolling;
  private speedSubscription: Subscription | undefined;

  constructor(
    context: BaseAudioContext,
    samples: Pick<SampleBank, 'rolling'>,
    mixer: Pick<Mixer, 'inputs' | 'dispose'>,
  ) {
    this.mixer = mixer;
    this.rolling = new Rolling(context, samples.rolling, mixer.inputs.rolling);
  }

  connect({ speed$ }: { readonly speed$: Observable<number> }) {
    this.rolling.start();
    this.speedSubscription = speed$.subscribe((speed) => {
      this.rolling.setSpeed(speed);
    });
  }

  dispose() {
    this.speedSubscription?.unsubscribe();
    this.rolling.dispose();
    this.mixer.dispose();
  }
}
