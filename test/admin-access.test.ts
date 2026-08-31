import assert from 'node:assert/strict';
import test from 'node:test';
import { decideOrganizerAccess } from '../src/admin/access.ts';

test('authorizes a confirmed organizer', () => {
  const decision = decideOrganizerAccess(
    { data: { email: 'owner@example.com' }, error: null },
    { data: null, error: null },
  );
  assert.equal(decision.state, 'authorized');
  assert.equal(decision.errorMessage, null);
});

test('only reports unauthorized after a successful empty organizer lookup', () => {
  const decision = decideOrganizerAccess(
    { data: null, error: null },
    { data: { status: 'pending' }, error: null },
  );
  assert.equal(decision.state, 'unauthorized');
  assert.equal(decision.requestStatus, 'pending');
});

test('does not treat a temporary query failure as unauthorized', () => {
  const decision = decideOrganizerAccess(
    { data: null, error: { message: 'Failed to fetch' } },
    { data: null, error: null },
  );
  assert.equal(decision.state, 'error');
  assert.equal(decision.errorMessage, 'Failed to fetch');
});
