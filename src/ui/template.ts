import { html } from 'lit-html';
import { live } from 'lit-html/directives/live.js';
import type { Observable } from 'rxjs';
import type { ControlState } from '../core/controls';
import { clamp } from '../core/helpers';
import { observableValue } from './observable-value';
import type { MotionLabel } from '../core/motion-label';
import type { TrainConfig } from '../simulator/types/train';

export function trainTemplate(props: {
  trainConfig: TrainConfig;
  trackLength: number;
  controlState$: Observable<ControlState>;
  speed$: Observable<number>;
  position$: Observable<number>;
  motionLabel$: Observable<MotionLabel>;
  onAccelerationChange: (level: number) => void;
  onBrakeChange: (level: number) => void;
}) {
  return html`
    <section class="drive-panel panel">
      <div class="section-line">
        <span class="eyebrow">DRIVE</span>
        <span class="pill" id="motion-label"
          >${observableValue(props.motionLabel$, (label) => label.toUpperCase(), 'IDLE')}</span
        >
      </div>
      <div class="speed-display">
        <span id="speed"
          >${observableValue(props.speed$, (speed) => `${Math.round(speed * 3.6)}`, '0')}</span
        ><span class="speed-unit">km/h</span>
      </div>
      <div class="speed-scale">
        <div
          id="speed-bar"
          style=${observableValue(
            props.speed$,
            (speed) =>
              `width: ${clamp((speed * 3.6) / props.trainConfig.maximumSpeed, 0, 1) * 100}%`,
            'width: 0%',
          )}
        ></div>
      </div>
      <div class="scale-labels">
        <span>0</span>
        <span>${Math.floor(props.trainConfig.maximumSpeed * 0.5)}</span>
        <span>${props.trainConfig.maximumSpeed}</span>
      </div>
      <p class="hint" id="distance" aria-label="Distance travelled / total track length">
        ${observableValue(props.position$, (position) => (position / 1000).toFixed(3), '0.000')} /
        ${(props.trackLength / 1000).toFixed(3)} km
      </p>
      <label class="slider-label" for="throttle"
        >Throttle
        <output id="throttle-value"
          >${observableValue(
            props.controlState$,
            ({ accelerateLevel }) => `${Math.round(accelerateLevel * 100)}%`,
            '0%',
          )}</output
        ></label
      ><input
        id="throttle"
        type="range"
        min="0"
        max="100"
        .value=${observableValue(
          props.controlState$,
          ({ accelerateLevel }) => live(String(Math.round(accelerateLevel * 100))),
          live('0'),
        )}
        @input=${({ currentTarget }: Event) =>
          props.onAccelerationChange((currentTarget as HTMLInputElement).valueAsNumber / 100)}
      />
      <label class="slider-label" for="brake"
        >Service brake
        <output id="brake-value"
          >${observableValue(
            props.controlState$,
            ({ brakeLevel }) => `${Math.round(brakeLevel * 100)}%`,
            '0%',
          )}</output
        ></label
      ><input
        class="brake-range"
        id="brake"
        type="range"
        min="0"
        max="100"
        .value=${observableValue(
          props.controlState$,
          ({ brakeLevel }) => live(String(Math.round(brakeLevel * 100))),
          live('0'),
        )}
        @input=${({ currentTarget }: Event) =>
          props.onBrakeChange((currentTarget as HTMLInputElement).valueAsNumber / 100)}
      />
    </section>
  `;
}
