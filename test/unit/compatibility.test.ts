/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getCompatibilityHint } from '../../nodes/VtigerOss/transport/compatibility';
import { requestFailure } from '../../nodes/VtigerOss/transport/errors';

test('maps known operation and version combinations to compatibility hints', () => {
	assert.match(getCompatibilityHint('files_retrieve', '8.3.0') ?? '', /file_id/);
	assert.equal(getCompatibilityHint('files_retrieve', '8.4.0'), undefined);
	assert.equal(getCompatibilityHint('files_retrieve', '7.5.0'), undefined);
	assert.match(getCompatibilityHint('convertlead', '8.4.0') ?? '', /encoded element/);
	assert.match(getCompatibilityHint('sync', '8.2.0') ?? '', /syncType/);
	assert.equal(getCompatibilityHint('retrieve', '8.3.0'), undefined);
});

test('adds hints to HTTP 500 handler failures but not explicit client errors', () => {
	const hint = 'Known compatibility issue';
	assert.match(requestFailure('sync', { httpCode: 500 }, hint).message, /Known compatibility/);
	assert.doesNotMatch(
		requestFailure('sync', { httpCode: 503 }, hint).message,
		/Known compatibility/,
	);
});
