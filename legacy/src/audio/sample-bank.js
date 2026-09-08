export function validateManifest(manifest) {
  if (!Array.isArray(manifest.samples) || !manifest.samples.some((s) => s.kind === 'joint'))
    throw new Error('A recorded joint sample is required. No synthetic fallback is used.');
  const ids = new Set();
  for (const s of manifest.samples) {
    if (!s.id || ids.has(s.id) || !s.url || !s.source || !s.license)
      throw new Error('Each recording needs a unique ID, URL, source and licence');
    ids.add(s.id);
  }
  return manifest;
}
function hash(text) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
export function chooseSample(pool, key, previous) {
  if (!pool.length) return null;
  let i = hash(key) % pool.length;
  if (pool.length > 1 && pool[i].id === previous) i = (i + 1) % pool.length;
  return pool[i];
}
export class SampleBank {
  constructor(context) {
    this.context = context;
    this.samples = [];
    this.previous = new Map();
  }
  async load(url = './public/audio/manifest.json') {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Recorded sound pack is unavailable');
    this.manifest = validateManifest(await response.json());
    this.samples = await Promise.all(
      this.manifest.samples.map(async (sample) => {
        const r = await fetch(new URL(sample.url, new URL(url, location.href)));
        if (!r.ok) throw new Error(`Recording unavailable: ${sample.id}`);
        const buffer = await this.context.decodeAudioData(await r.arrayBuffer());
        return { ...sample, buffer };
      }),
    );
    return this;
  }
  pool(kind) {
    return this.samples.filter((s) => s.kind === kind);
  }
  select(event) {
    const kind = event.kind === 'weld' && this.pool('weld').length ? 'weld' : 'joint';
    const voice = `${event.wheelsetId}:${event.side}`;
    const s = chooseSample(this.pool(kind), `${event.objectId}:${voice}`, this.previous.get(voice));
    if (s) this.previous.set(voice, s.id);
    return s;
  }
}
