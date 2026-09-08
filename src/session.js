import { Transport } from './audio/scheduler.js?v=subtle-welds';
import { SampleBank } from './audio/sample-bank.js';
import { SpatialMixer } from './audio/spatial-mixer.js?v=subtle-welds';
import { AudioEngine } from './audio/engine.js?v=review-fixes';
import { AUDIO_SETTINGS, MIX_LEVELS } from './audio/settings.js';
import { listenerSeat } from './route/route-index.js';

/** DOM-independent owner of a transport and its audio graph. */
export class TrainSession {
  constructor({
    createContext = () => new AudioContext({ latencyHint: 'interactive' }),
    loadBank = (context) => new SampleBank(context).load(),
    createMixer = (context, bank, axles) => new SpatialMixer(context, bank, axles),
    createEngine = (context, bank, mixer) => new AudioEngine(context, bank, mixer),
  } = {}) {
    Object.assign(this, { createContext, loadBank, createMixer, createEngine });
  }

  async enable(options) {
    if (this.bank) return;
    this.context ||= this.createContext();
    await this.context.resume();
    const bank = await this.loadBank(this.context);
    this.bank = bank;
    try {
      // Read controls/navigation after decoding: the UI stays usable while loading.
      this.configure(typeof options === 'function' ? options() : options);
    } catch (error) {
      this.bank = undefined;
      this.engine?.stop();
      this.mixer?.dispose();
      this.engine = this.mixer = this.transport = undefined;
      throw error;
    }
  }

  configure({ route, axles, position = 0, controls = {}, settings = {} }) {
    this.transport?.pause();
    this.engine?.stop();
    this.mixer?.dispose();
    this.route = route;
    const options = {
      ...AUDIO_SETTINGS,
      seat: listenerSeat(axles.length / 4),
      ...settings,
    };
    const mixer = this.createMixer(this.context, this.bank, axles);
    this.mixer = mixer;
    mixer.motorMode = options.motorMode;
    mixer.master.gain.value = options.master;
    mixer.setListener(options.seat, options.yaw);
    mixer.setSpatial(options.spatial);
    Object.assign(mixer.levels, MIX_LEVELS, options.levels);
    const engine = this.createEngine(this.context, this.bank, mixer);
    this.engine = engine;
    // Capture this graph: a discarded transport must never cancel the next graph.
    const sink = {
      hit: (...args) => mixer.hit(...args),
      horn: (...args) => mixer.horn(...args),
      power: (...args) => mixer.power(...args),
      cancelFrom: (time) => mixer.cancelFrom(time),
      silence: () => {
        mixer.silence();
        engine.stop();
      },
    };
    this.transport = new Transport({
      clock: () => this.context.currentTime,
      sink,
      route,
      axles,
    });
    this.transport.seek(position);
    this.transport.updateControls(controls);
  }

  start() {
    this.engine.start();
    this.transport.start();
  }

  tick() {
    if (!this.transport) return null;
    if (this.context.state !== 'running' && this.transport.running) {
      this.transport.pause();
      return 'audio interrupted';
    }
    const wasRunning = this.transport.running;
    this.transport.tick();
    const state = this.transport.snapshot();
    this.engine.update(
      state,
      {
        ...this.transport.controls,
        powerAvailable: this.route.powerAt(state.position),
      },
      this.transport.running,
    );
    return wasRunning && !this.transport.running ? 'audio timing interruption' : null;
  }
}
