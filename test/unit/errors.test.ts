/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	requestFailure,
	unwrapVtigerResponse,
	VtigerApiError,
} from '../../nodes/VtigerOss/transport/errors';

test('unwraps successful vtiger responses', () => {
	assert.deepEqual(unwrapVtigerResponse({ success: true, result: { id: '12x3' } }, 'retrieve'), {
		id: '12x3',
	});
});

test('turns success false responses into typed errors', () => {
	assert.throws(
		() =>
			unwrapVtigerResponse(
				{ success: false, error: { code: 'ACCESS_DENIED', message: 'Permission denied' } },
				'retrieve',
			),
		(error: unknown) =>
			error instanceof VtigerApiError &&
			error.code === 'ACCESS_DENIED' &&
			error.operation === 'retrieve',
	);
});

test('rejects malformed response envelopes', () => {
	assert.throws(() => unwrapVtigerResponse({ result: [] }, 'listtypes'), VtigerApiError);
	assert.throws(() => unwrapVtigerResponse({ success: true }, 'listtypes'), VtigerApiError);
});

test('preserves numeric HTTP status without exposing request details', () => {
	const error = requestFailure('login', { httpCode: '503', message: 'secret request body' });
	assert.equal(error.statusCode, 503);
	assert.equal(error.message, 'Request for Vtiger operation "login" failed');
});

test('adds compatibility guidance when a handler failure has no HTTP status', () => {
	const hint = 'Vtiger may register id while the PHP handler expects file_id';
	const error = requestFailure('files_retrieve', new Error('socket closed'), hint);

	assert.equal(
		error.message,
		'Request for Vtiger operation "files_retrieve" failed. Compatibility note: Vtiger may register id while the PHP handler expects file_id.',
	);
});

test('does not add compatibility guidance to an explicit non-500 response', () => {
	const error = requestFailure('files_retrieve', { httpCode: 403 }, 'Unrelated server mismatch');

	assert.equal(error.message, 'Request for Vtiger operation "files_retrieve" failed');
});
