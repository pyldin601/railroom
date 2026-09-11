import assert from 'node:assert/strict';
import test from 'node:test';
import { SampleBank } from '../src/audio/sample-bank.ts';

test('loads the rolling recording declared by the manifest', async (t) => {
  const manifestUrl = new URL('https://example.test/audio/manifest.json');
  const recordingUrl = new URL('rolling-rail.wav', manifestUrl);
  const decoded = {};

  t.mock.method(globalThis, 'fetch', (url) => {
    if (url.href === manifestUrl.href) {
      return Promise.resolve(Response.json({ rolling: { url: 'rolling-rail.wav' } }));
    }
    if (url.href === recordingUrl.href) {
      return Promise.resolve(new Response(new Uint8Array([1, 2, 3])));
    }
    return Promise.resolve(new Response(null, { status: 404 }));
  });

  const bank = await SampleBank.create(
    {
      decodeAudioData() {
        return Promise.resolve(decoded);
      },
    },
    manifestUrl,
  );

  assert.equal(bank.rolling, decoded);
});
