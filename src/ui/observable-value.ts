import { AsyncDirective } from 'lit-html/async-directive.js';
import { directive } from 'lit-html/directive.js';
import type { Observable, Subscription } from 'rxjs';

class ObservableValueDirective<T, Value> extends AsyncDirective {
  private source: Observable<T> | undefined;
  private format: ((value: T) => Value) | undefined;
  private subscription: Subscription | undefined;

  render(source: Observable<T>, format: (value: T) => Value, initialValue: Value) {
    this.source = source;
    this.format = format;
    this.subscribe();
    return initialValue;
  }

  disconnected() {
    this.subscription?.unsubscribe();
    this.subscription = undefined;
  }

  reconnected() {
    this.subscribe();
  }

  private subscribe() {
    const { source, format } = this;
    if (!this.isConnected || !source || !format || this.subscription) return;

    queueMicrotask(() => {
      if (
        !this.isConnected ||
        source !== this.source ||
        format !== this.format ||
        this.subscription
      ) {
        return;
      }

      this.subscription = source.subscribe((value) => this.setValue(format(value)));
    });
  }
}

/** Renders values from an observable without re-rendering the containing template. */
export function observableValue<T, Value>(
  source: Observable<T>,
  format: (value: T) => Value,
  initialValue: Value,
) {
  return directive(ObservableValueDirective<T, Value>)(source, format, initialValue);
}
