import assert from 'node:assert/strict';
import test from 'node:test';

import { CURRENCY_SYMBOLS } from '../src/data/constants.js';
import { getFaviconICO, getHTML, getIconPNG, getIconSVG, getManifest, getServiceWorker } from '../src/ui/template.js';
import { getCountryMap } from '../src/utils/country.js';

function getInlineScript(html) {
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, 'inline script should exist');
  return match[1];
}

test('rendered inline script has valid JavaScript syntax', () => {
  const script = getInlineScript(getHTML());
  assert.doesNotThrow(() => new Function(script));
});

test('frontend country map is generated from backend country map', () => {
  const script = getInlineScript(getHTML());
  const match = script.match(/const FLAG_MAP = (\{[^\n]+\});/);
  assert.ok(match, 'FLAG_MAP should be rendered');

  const actual = JSON.parse(match[1]);
  const expected = Object.fromEntries(
    Object.entries(getCountryMap()).map(([prefix, info]) => [prefix, info.code])
  );

  assert.deepEqual(actual, expected);
});

test('frontend currency symbols are generated from shared constants', () => {
  const script = getInlineScript(getHTML());
  const match = script.match(/const CURRENCY_SYMBOLS = (\{[^\n]+\});/);
  assert.ok(match, 'CURRENCY_SYMBOLS should be rendered');

  assert.deepEqual(JSON.parse(match[1]), CURRENCY_SYMBOLS);
});

test('manifest and service worker assets are generated', () => {
  const manifest = getManifest();
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/');
  assert.ok(manifest.icons.some((icon) => icon.src === '/icon-192.png'));
  assert.ok(manifest.icons.some((icon) => icon.src === '/icon-512.png'));
  assert.ok(manifest.icons.some((icon) => icon.src === '/icon.svg'));

  const sw = getServiceWorker();
  assert.match(sw, /CACHE_NAME/);
  assert.match(sw, /url\.pathname\.startsWith\('\/api\/'\)/);
  assert.match(sw, /\/favicon\.ico/);

  assert.match(getIconSVG(), /^<svg /);
  assert.ok(getIconPNG(192).byteLength > 1000);
  assert.ok(getIconPNG(512).byteLength > getIconPNG(192).byteLength);
  assert.equal(getFaviconICO()[0], 0);
});

test('html registers the manifest and service worker', () => {
  const html = getHTML();
  assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest">/);
  assert.match(html, /<link rel="icon" href="\/favicon\.ico" sizes="any">/);
  assert.match(html, /<link rel="apple-touch-icon" href="\/icon-192\.png">/);
  assert.match(html, /navigator\.serviceWorker\.register\('\/sw\.js'\)/);
});

test('dashboard header uses the project brand icon', () => {
  const html = getHTML();
  assert.match(html, /<img src="\/icon\.svg" alt="" class="[^"]*w-8[^"]*"> Sub-Tracker/);
  assert.doesNotMatch(html, /fa-chart-line[^<]*<\/i> Sub-Tracker/);
});

test('html includes analytics and history surfaces', () => {
  const html = getHTML();
  assert.match(html, /id="analytics-panel"/);
  assert.match(html, /id="history-overlay"/);
  assert.match(html, /function renderAnalytics\(\)/);
  assert.match(html, /function openHistory\(\)/);
});
