import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { getClientScript } from '../src/ui/client-script.js';
import { getHTML } from '../src/ui/template.js';

test('renew modal distinguishes subscriptions from eSIM balance renewals', () => {
  const script = getClientScript();
  const html = getHTML();
  const worker = readFileSync(new URL('../worker/worker.js', import.meta.url), 'utf8');

  assert.match(script, /item\.type === 'esim'/);
  assert.match(script, /isEsim \? '续期 eSIM' : '续期订阅'/);
  assert.match(script, /classList\.toggle\('hidden', !isEsim\)/);
  assert.match(script, /if \(isEsim && deltaRaw !== ''\)/);
  assert.match(html, /id="renew-title"/);
  assert.match(html, /id="renew-balance-fields"/);
  assert.match(worker, /id="renew-title"/);
  assert.match(worker, /renew-balance-fields/);
  assert.match(worker, /isEsim \? '\\u7EED\\u671F eSIM' : '\\u7EED\\u671F\\u8BA2\\u9605'/);
});

test('wap and mobile responsive layout optimizations for bottom subscription list', () => {
  const html = getHTML();
  const script = getClientScript();
  const worker = readFileSync(new URL('../worker/worker.js', import.meta.url), 'utf8');

  // Mobile body padding clearance for FAB and mobile navigation toolbar
  assert.match(html, /padding-bottom:\s*calc\(env\(safe-area-inset-bottom,\s*0px\)\s*\+\s*6\.5rem\)\s*!important/);
  // FAB container respects safe-area
  assert.match(html, /fab-container/);
  assert.match(html, /\.fab-container\s*\{\s*bottom:\s*calc\(env\(safe-area-inset-bottom,\s*0px\)\s*\+\s*1\.25rem\)\s*!important;\s*\}/);
  // Dashboard view has extra bottom padding
  assert.match(html, /id="dashboard-view"[^>]*pb-28/);
  // Viewport unit uses dvh
  assert.match(html, /min-height:\s*100dvh/);
  // Collapsible analytics details toggle on mobile
  assert.match(script, /toggleAnalyticsDetails/);
  assert.match(script, /id="analytics-toggle-btn"/);
  assert.match(worker, /toggleAnalyticsDetails/);
  // Responsive table columns for mobile list view
  assert.match(script, /hidden md:table-cell/);
  assert.match(script, /hidden sm:table-cell/);
});

