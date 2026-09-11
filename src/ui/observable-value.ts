import { AsyncDirective } from 'lit-html/async-directive.js';
import { directive } from 'lit-html/directive.js';
import { Subscription } from 'rxjs';
import type { Observable } from 'rxjs';

class ObservableValueDirective<T, Value> extends AsyncDirective {
  private source: Observable<T> | undefined;
  private format: ((value: T) => Value) | undefined;
  private subscription: Subscription | undefined;
  private latest: { value: T } | undefined;
  private rendering = false;

  render(source: Observable<T>, format: (value: T) => Value, initialValue: Value) {
    if (source !== this.source) {
      this.disconnected();
      this.latest = undefined;
    }
    this.source = source;
    this.format = format;
    this.rendering = true;
    try {
      this.subscribe();
      return this.latest ? format(this.latest.value) : initialValue;
    } finally {
      this.rendering = false;
    }
  }

  disconnected() {
    this.subscription?.unsubscribe();
    this.subscription = undefined;
  }

  reconnected() {
    this.subscribe();
  }

  private subscribe() {
    const { source } = this;
    if (!this.isConnected || !source || this.subscription) {
      return;
    }

    const subscription = new Subscription();
    this.subscription = subscription;
    subscription.add(
      source.subscribe((value) => {
        this.latest = { value };
        // Synchronous emissions are returned by render; later ones update the part directly.
        if (!this.rendering && this.isConnected && this.format) {
          this.setValue(this.format(value));
        }
      }),
    );
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
