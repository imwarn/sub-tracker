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
