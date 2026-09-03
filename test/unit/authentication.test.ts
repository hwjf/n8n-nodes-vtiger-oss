/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	authenticate,
	createChallengeHash,
	normalizeBaseUrl,
	parseCredentials,
} from '../../nodes/VtigerOss/transport/authentication';
import { VtigerApiError } from '../../nodes/VtigerOss/transport/errors';
import type { VtigerRequest } from '../../nodes/VtigerOss/transport/types';

test('creates the vtiger challenge hash', () => {
	assert.equal(
		createChallengeHash('challenge-token', 'access-key'),
		'ed01937a931729771c065beefbdd2901',
	);
});

test('normalizes HTTPS base URLs and rejects insecure URLs by default', () => {
	assert.equal(
		normalizeBaseUrl('https://crm.example.com/vtiger/'),
		'https://crm.example.com/vtiger',
	);
	assert.throws(() => normalizeBaseUrl('http://crm.example.com'), VtigerApiError);
	assert.equal(normalizeBaseUrl('http://localhost/vtiger', true), 'http://localhost/vtiger');
	assert.throws(
		() => normalizeBaseUrl('https://crm.example.com/webservice.php/'),
		/webservice\.php/,
	);
});

test('rejects empty credentials and trims valid credential values', () => {
	assert.throws(
		() => parseCredentials({ baseUrl: 'https://crm.example.com', username: ' ', apiKey: 'key' }),
		/must not be empty/,
	);
	assert.deepEqual(
		parseCredentials({
			baseUrl: ' https://crm.example.com/vtiger/ ',
			username: ' api-user ',
			apiKey: ' secret ',
		}),
		{
			baseUrl: 'https://crm.example.com/vtiger',
			username: 'api-user',
			apiKey: 'secret',
			allowInsecureHttp: false,
		},
	);
});

test('authenticates with challenge and login requests', async () => {
	const requests: Parameters<VtigerRequest>[0][] = [];
	const request: VtigerRequest = async (options) => {
		requests.push(options);
		if (requests.length === 1) return { success: true, result: { token: 'token' } };
		return { success: true, result: { sessionName: 'session', userId: '19x1' } };
	};

	const session = await authenticate(request, {
		baseUrl: 'https://crm.example.com',
		username: 'api-user',
		apiKey: 'secret',
		allowInsecureHttp: false,
	});

	assert.equal(session.sessionName, 'session');
	assert.equal(requests.length, 2);
	assert.deepEqual(requests[0].qs, { operation: 'getchallenge', username: 'api-user' });
	const loginBody = requests[1].body as URLSearchParams;
	assert.equal(loginBody.get('operation'), 'login');
	assert.equal(loginBody.get('username'), 'api-user');
	assert.notEqual(loginBody.get('accessKey'), 'secret');
});

test('rejects failed challenges and login responses without a session', async () => {
	await assert.rejects(
		authenticate(
			async () => ({ success: false, error: { code: 'ACCESS_DENIED', message: 'Denied' } }),
			{
				baseUrl: 'https://crm.example.com',
				username: 'api-user',
				apiKey: 'secret',
				allowInsecureHttp: false,
			},
		),
		(error: unknown) => error instanceof VtigerApiError && error.code === 'ACCESS_DENIED',
	);

	let requestCount = 0;
	await assert.rejects(
		authenticate(
			async () => {
				requestCount++;
				return requestCount === 1
					? { success: true, result: { token: 'token' } }
					: { success: true, result: {} };
			},
			{
				baseUrl: 'https://crm.example.com',
				username: 'api-user',
				apiKey: 'secret',
				allowInsecureHttp: false,
			},
		),
		/no session/,
	);
});
