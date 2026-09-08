import { createServer } from 'node:http';
import { readFile, mkdtemp, rm, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, resolve, extname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// A fresh headless profile tests actual browser audio without npm dependencies.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const candidates = [
  process.env.BROWSER_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  process.env.PROGRAMFILES &&
    join(process.env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe'),
].filter(Boolean);
let binary;
for (const candidate of candidates) {
  try {
    await access(candidate);
    binary = candidate;
    break;
  } catch {}
}
if (!binary) throw Error('Chrome/Chromium not found. Set BROWSER_BIN to its executable path.');
const profile = await mkdtemp(join(tmpdir(), 'railroom-browser-'));
const token = randomUUID();
let finish;
const completed = new Promise((resolve) => {
  finish = resolve;
});
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.wav': 'audio/wav',
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (req.method === 'POST' && url.pathname === `/__results/${token}`) {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 1e6) throw Error('Oversized test result');
      }
      const report = JSON.parse(body);
      res.writeHead(204);
      res.end();
      finish(report);
      return;
    }
    const path = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (
      req.method !== 'GET' ||
      !path.startsWith(root + sep) ||
      !/^\/(index\.html|src\/|public\/|tests\/)/.test(url.pathname)
    ) {
      res.writeHead(404);
      res.end();
      return;
    }
    const data = await readFile(path);
    res.writeHead(200, {
      'Content-Type': mime[extname(path)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
let browser,
  timeout,
  diagnostics = '';
try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const url = `http://127.0.0.1:${server.address().port}/tests/browser-harness.html?report=${token}`;
  browser = spawn(
    binary,
    [
      '--headless',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--autoplay-policy=no-user-gesture-required',
      '--mute-audio',
      url,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  browser.stderr.on('data', (chunk) => {
    diagnostics = (diagnostics + chunk).slice(-4000);
  });
  browser.on('error', (error) => finish({ passed: false, results: [error.message] }));
  browser.on('exit', (code, signal) =>
    finish({
      passed: false,
      results: [`Browser exited before reporting (${signal || code}).`, diagnostics],
    }),
  );
  timeout = setTimeout(
    () =>
      finish({
        passed: false,
        results: ['Browser checks timed out after 90 seconds.', diagnostics],
      }),
    90000,
  );
  const report = await completed;
  console.log((report.results || []).join('\n'));
  process.exitCode = report.passed ? 0 : 1;
} finally {
  clearTimeout(timeout);
  if (browser?.pid && browser.exitCode === null && browser.signalCode === null) {
    const exited = new Promise((resolve) => browser.once('exit', resolve));
    browser.kill();
    const force = setTimeout(() => browser.kill('SIGKILL'), 3000);
    await exited;
    clearTimeout(force);
  }
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await rm(profile, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100,
  });
}
