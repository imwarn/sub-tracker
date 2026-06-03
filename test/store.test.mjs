import assert from 'node:assert/strict';
import test from 'node:test';

import { addHistory, clearHistory, deleteItem, getHistory, saveAllItems } from '../src/data/store.js';

function createMockKV() {
  const data = new Map();
  return {
    async get(key, options) {
      const value = data.get(key);
      if (options?.type === 'json') return value ? JSON.parse(value) : null;
      return value ?? null;
    },
    async put(key, value) {
      data.set(key, value);
    },
    async delete(key) {
      data.delete(key);
    },
  };
}

test('deleteItem returns the deleted item for history logging', async () => {
  const db = createMockKV();
  await saveAllItems(db, [
    { id: 'a', type: 'esim', name: 'A' },
    { id: 'b', type: 'subscription', name: 'B' },
  ]);

  const deleted = await deleteItem(db, 'a');
  assert.equal(deleted.id, 'a');

  const missing = await deleteItem(db, 'missing');
  assert.equal(missing, false);
});

test('activity history is newest-first and can be cleared', async () => {
  const db = createMockKV();

  await addHistory(db, { action: 'create', itemName: 'First' });
  await addHistory(db, { action: 'delete', itemName: 'Second' });

  const history = await getHistory(db);
  assert.equal(history.length, 2);
  assert.equal(history[0].action, 'delete');
  assert.match(history[0].id, /^[0-9a-f-]{36}$/i);
  assert.match(history[0].timestamp, /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/);

  await clearHistory(db);
  assert.deepEqual(await getHistory(db), []);
});
