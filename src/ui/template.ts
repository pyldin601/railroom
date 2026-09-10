import { html } from 'lit-html';
import { live } from 'lit-html/directives/live.js';
import type { Observable } from 'rxjs';
import type { ControlState } from '../core/controls';
import { observableValue } from './observable-value';

export function trainTemplate(props: {
  controlState$: Observable<ControlState>;
  speed$: Observable<number>;
  onAccelerationChange: (level: number) => void;
  onBrakeChange: (level: number) => void;
}) {
  return html`
    <section class="drive-panel panel">
      <div class="speed-display">
        <span id="speed">${observableValue(props.speed$, (speed) => `${speed * 3.6}`, '0')}</span
        ><span class="speed-unit">km/h</span>
      </div>
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
