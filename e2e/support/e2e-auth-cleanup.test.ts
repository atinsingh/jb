import assert from 'node:assert/strict';
import { test } from 'node:test';
import { e2eAuthUserIds } from './e2e-auth-users.ts';

test('e2e auth cleanup keeps real accounts and the demo user', () => {
  const ids = e2eAuthUserIds([
    [
      { id: 'candidate', email: 'candidate-e2e-auto-abc@example.com' },
      { id: 'maya', email: 'maya.ellison@example.com' },
      { id: 'real', email: 'harkit@pragra.io' },
    ],
    [
      { id: 'employer', email: 'employer-e2e-auto-def@example.com' },
      { id: 'signup', email: 'signup-candidate-e2e-auto-ghi@jobocate.com' },
      { id: 'blank', email: undefined },
    ],
  ]);

  assert.deepEqual(ids, ['candidate', 'employer', 'signup']);
});
