// Node has no Web Audio renderer. This boundary double advances real source
// lifetimes; browser coverage separately verifies native rendering and callbacks.
function parameter(value = 1) {
  return {
    value,
    setValueAtTime(value) {
      if (!Number.isFinite(value)) throw new TypeError('Non-finite AudioParam');
      this.value = value;
    },
    setTargetAtTime(value) {
      this.setValueAtTime(value);
    },
    linearRampToValueAtTime(value) {
      this.setValueAtTime(value);
    },
    cancelScheduledValues() {},
  };
}

function node() {
  const result = {
    connect(destination) {
      return destination;
    },
    disconnect() {
      this.disconnected = true;
    },
    getFloatTimeDomainData() {},
  };
  for (const name of [
    'gain',
    'frequency',
    'Q',
    'positionX',
    'positionY',
    'positionZ',
    'threshold',
    'knee',
    'ratio',
    'delayTime',
  ]) {
    result[name] = parameter();
  }
  return result;
}

export function virtualAudioContext() {
  const context = {
    currentTime: 0,
    sampleRate: 48000,
    sources: new Set(),
    createdSources: [],
    destination: node(),
    listener: Object.fromEntries(
      ['positionX', 'positionY', 'positionZ', 'forwardX', 'forwardY', 'forwardZ', 'upY'].map(
        (name) => [name, parameter()],
      ),
    ),
    createBuffer(channels, length, rate) {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return {
        numberOfChannels: channels,
        duration: length / rate,
        sampleRate: rate,
        getChannelData: (channel) => data[channel],
        copyToChannel: (input, channel) => data[channel].set(input),
      };
    },
    createBufferSource() {
      const source = Object.assign(node(), {
        playbackRate: parameter(),
        start(when = 0) {
          this.naturalEnd =
            Math.max(when, context.currentTime) + this.buffer.duration / this.playbackRate.value;
          context.sources.add(this);
        },
        stop(when = 0) {
          this.stopTime = when;
        },
      });
      context.createdSources.push(source);
      return source;
    },
    advance(time) {
      this.currentTime = time;
      for (const source of [...this.sources]) {
        if (Math.min(source.naturalEnd, source.stopTime ?? Infinity) <= time) {
          this.sources.delete(source);
          source.onended?.();
        }
      }
    },
  };
  for (const name of [
    'createGain',
    'createPanner',
    'createBiquadFilter',
    'createDelay',
    'createDynamicsCompressor',
    'createAnalyser',
  ]) {
    context[name] = node;
  }
  return context;
}
