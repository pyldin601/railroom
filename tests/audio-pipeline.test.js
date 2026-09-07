import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('audio staging validates complete packs and protects installed recordings', () => {
  const result = spawnSync(
    'python3',
    [fileURLToPath(new URL('audio_pipeline_test.py', import.meta.url))],
    {
      encoding: 'utf8',
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
    },
  );
  assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
});
