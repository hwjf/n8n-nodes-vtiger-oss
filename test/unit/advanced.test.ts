/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	serializeCustomParameters,
	validateCustomOperation,
} from '../../nodes/VtigerOss/helpers/advanced';

test('validates custom operation names and encodes structured parameters', () => {
	assert.equal(validateCustomOperation('mobile.query'), 'mobile.query');
	assert.deepEqual(serializeCustomParameters({ id: '12x1', element: { subject: 'Test' } }), {
		id: '12x1',
		element: '{"subject":"Test"}',
	});
});

test('blocks authentication and reserved custom parameters', () => {
	assert.throws(() => validateCustomOperation('login'), /Authentication operations/);
	assert.throws(() => validateCustomOperation('../login'), /invalid/);
	assert.throws(() => serializeCustomParameters({ operation: 'delete' }), /reserved/);
	assert.throws(() => serializeCustomParameters({ SESSIONNAME: 'attacker' }), /reserved/);
});
