/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { VtigerClient } from '../../nodes/VtigerOss/transport/client';

test('protects reserved operation and session parameters', async () => {
	const requests: IHttpRequestOptions[] = [];
	const context = {
		getCredentials: async () => ({
			baseUrl: 'https://crm.example.com',
			username: 'api-user',
			apiKey: 'secret',
			allowInsecureHttp: false,
		}),
		helpers: {
			httpRequest: async (options: IHttpRequestOptions) => {
				requests.push(options);
				if (requests.length === 1) return { success: true, result: { token: 'token' } };
				if (requests.length === 2) return { success: true, result: { sessionName: 'session' } };
				return { success: true, result: { ok: true } };
			},
		},
	} as unknown as IExecuteFunctions;

	const client = await VtigerClient.create(context);
	await client.request({
		method: 'GET',
		operation: 'retrieve',
		parameters: { operation: 'delete', sessionName: 'attacker-session', id: '12x3' },
	});
	await client.request({
		method: 'POST',
		operation: 'revise',
		parameters: { operation: 'delete', sessionName: 'attacker-session', element: '{}' },
	});
	await client.requestMultipart({
		operation: 'create',
		parameters: {
			operation: 'delete',
			sessionName: 'attacker-session',
			elementType: 'Documents',
		},
		file: {
			fieldName: 'filename',
			data: Buffer.from('hello'),
			fileName: 'test.txt',
			mimeType: 'text/plain',
		},
	});

	assert.equal(requests.length, 5);
	assert.equal(requests[2].qs?.operation, 'retrieve');
	assert.equal(requests[2].qs?.sessionName, 'session');
	const postBody = requests[3].body as URLSearchParams;
	assert.equal(postBody.get('operation'), 'revise');
	assert.equal(postBody.get('sessionName'), 'session');
	const multipartBody = requests[4].body as unknown as FormData;
	assert.equal(multipartBody.get('operation'), 'create');
	assert.equal(multipartBody.get('sessionName'), 'session');
	assert.equal(multipartBody.getAll('operation').length, 1);
	assert.equal(multipartBody.getAll('sessionName').length, 1);
	const uploadedFile = multipartBody.get('filename') as File;
	assert.equal(uploadedFile.name, 'test.txt');
	assert.equal(uploadedFile.type, 'text/plain');
	assert.equal(await uploadedFile.text(), 'hello');
	assert.equal(requests[4].headers, undefined);
	assert.equal(requests[4].timeout, 300000);
});
