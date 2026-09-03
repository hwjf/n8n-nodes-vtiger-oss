/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ICredentialTestFunctions } from 'n8n-workflow';
import { testVtigerCredentials } from '../../nodes/VtigerOss/transport/credentialTest';

test('credential test performs challenge, form login, and metadata request', async () => {
	const requests: Record<string, unknown>[] = [];
	const context = {
		helpers: {
			httpRequest: async (options: Record<string, unknown>) => {
				requests.push(options);
				if (requests.length === 1) return { success: true, result: { token: 'token' } };
				if (requests.length === 2) return { success: true, result: { sessionName: 'session' } };
				return { success: true, result: ['Contacts'] };
			},
		},
	} as unknown as ICredentialTestFunctions;

	const result = await testVtigerCredentials.call(context, {
		id: 'credential-id',
		name: 'Vtiger test',
		type: 'vtigerOssApi',
		data: {
			baseUrl: 'https://crm.example.com',
			username: 'api-user',
			apiKey: 'secret',
			allowInsecureHttp: false,
		},
	});

	assert.deepEqual(result, { status: 'OK', message: 'Connection successful' });
	assert.equal(requests.length, 3);
	assert.deepEqual(Object.fromEntries((requests[1].body as URLSearchParams).entries()), {
		operation: 'login',
		username: 'api-user',
		// The value is a deterministic challenge hash fixture, not a credential.
		// eslint-disable-next-line @n8n/community-nodes/no-hardcoded-secrets
		accessKey: '1b0ebffcd35423aa7674c8cbb60581e4',
	});
	assert.deepEqual(requests[2].qs, { operation: 'listtypes', sessionName: 'session' });
});
