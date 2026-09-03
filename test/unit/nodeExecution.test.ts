/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { IExecuteFunctions, IHttpRequestOptions, INodeExecutionData } from 'n8n-workflow';
import { VtigerOss } from '../../nodes/VtigerOss/VtigerOss.node.ts';

function createContext(
	inputItems: INodeExecutionData[],
	request: (options: IHttpRequestOptions) => Promise<unknown>,
	parameters: Record<string, unknown[]>,
	continueOnFail = false,
): IExecuteFunctions {
	return {
		getInputData: () => inputItems,
		getCredentials: async () => ({
			baseUrl: 'https://crm.example.com',
			username: 'api-user',
			apiKey: 'secret',
			allowInsecureHttp: false,
		}),
		getNodeParameter: (name: string, itemIndex: number, fallback?: unknown) =>
			parameters[name]?.[itemIndex] ?? fallback,
		getNode: () => ({
			name: 'Vtiger Open Source',
			type: 'n8n-nodes-vtiger-oss.vtigerOss',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		}),
		continueOnFail: () => continueOnFail,
		helpers: {
			httpRequest: request,
			assertBinaryData: (itemIndex: number, propertyName: string) => {
				const binaryData = inputItems[itemIndex]?.binary?.[propertyName];
				if (!binaryData) throw new Error(`Missing binary data ${propertyName}`);
				return binaryData;
			},
			getBinaryDataBuffer: async (itemIndex: number, propertyName: string) => {
				const binaryData = inputItems[itemIndex]?.binary?.[propertyName];
				if (!binaryData) throw new Error(`Missing binary data ${propertyName}`);
				return Buffer.from(binaryData.data, 'base64');
			},
			prepareBinaryData: async (data: Buffer, fileName?: string, mimeType?: string) => ({
				data: data.toString('base64'),
				fileName,
				mimeType,
			}),
		},
	} as unknown as IExecuteFunctions;
}

test('logs in once and pairs each output item', async () => {
	const requests: IHttpRequestOptions[] = [];
	const context = createContext(
		[{ json: { source: 1 } }, { json: { source: 2 } }],
		async (options) => {
			requests.push(options);
			if (requests.length === 1) return { success: true, result: { token: 'token' } };
			if (requests.length === 2) return { success: true, result: { sessionName: 'session' } };
			return { success: true, result: { id: options.qs?.id } };
		},
		{
			resource: ['record', 'record'],
			operation: ['retrieve', 'retrieve'],
			recordId: ['12x1', '12x2'],
		},
	);

	const [output] = await new VtigerOss().execute.call(context);

	assert.equal(requests.length, 4);
	assert.deepEqual(
		output.map((item) => item.pairedItem),
		[0, 1],
	);
	assert.deepEqual(
		output.map((item) => item.json.id),
		['12x1', '12x2'],
	);
});

test('continueOnFail returns an item error and continues', async () => {
	let operationCount = 0;
	const context = createContext(
		[{ json: { source: 1 } }, { json: { source: 2 } }],
		async (options) => {
			if (options.qs?.operation === 'getchallenge') {
				return { success: true, result: { token: 'token' } };
			}
			if ((options.body as URLSearchParams | undefined)?.get('operation') === 'login') {
				return { success: true, result: { sessionName: 'session' } };
			}
			operationCount++;
			if (operationCount === 1) {
				return { success: false, error: { code: 'ACCESS_DENIED', message: 'Denied' } };
			}
			return { success: true, result: { id: '12x2' } };
		},
		{
			resource: ['record', 'record'],
			operation: ['retrieve', 'retrieve'],
			recordId: ['12x1', '12x2'],
		},
		true,
	);

	const [output] = await new VtigerOss().execute.call(context);

	assert.equal(output.length, 2);
	assert.ok(output[0].error);
	assert.deepEqual(output[0].pairedItem, 0);
	assert.equal(output[1].json.id, '12x2');
});

test('returns the standard confirmation after deleting a record', async () => {
	let deletedId = '';
	const context = createContext(
		[{ json: {} }],
		async (options) => {
			if (options.qs?.operation === 'getchallenge') {
				return { success: true, result: { token: 'token' } };
			}
			const body = options.body as URLSearchParams;
			if (body.get('operation') === 'login') {
				return { success: true, result: { sessionName: 'session' } };
			}
			deletedId = body.get('id') ?? '';
			return { success: true, result: true };
		},
		{
			resource: ['record'],
			operation: ['delete'],
			recordId: ['12x1'],
		},
	);

	const [output] = await new VtigerOss().execute.call(context);

	assert.equal(deletedId, '12x1');
	assert.deepEqual(output[0].json, { deleted: true });
});

test('applies selected output fields to supported actions', async () => {
	const context = createContext(
		[{ json: {} }],
		async (options) => {
			if (options.qs?.operation === 'getchallenge') {
				return { success: true, result: { token: 'token' } };
			}
			if ((options.body as URLSearchParams | undefined)?.get('operation') === 'login') {
				return { success: true, result: { sessionName: 'session' } };
			}
			return { success: true, result: { id: '12x1', firstname: 'Ada', email: 'ada@example.com' } };
		},
		{
			resource: ['record'],
			operation: ['retrieve'],
			recordId: ['12x1'],
			output: ['selected'],
			fieldsToInclude: ['id, email'],
		},
	);

	const [output] = await new VtigerOss().execute.call(context);

	assert.deepEqual(output[0].json, { id: '12x1', email: 'ada@example.com' });
});

test('revise sends only provided fields and the trusted record ID', async () => {
	let sentOperation = '';
	let revisedElement = '';
	const context = createContext(
		[{ json: {} }],
		async (options) => {
			if (options.qs?.operation === 'getchallenge') {
				return { success: true, result: { token: 'token' } };
			}
			const body = options.body as URLSearchParams;
			if (body.get('operation') === 'login') {
				return { success: true, result: { sessionName: 'session' } };
			}
			sentOperation = body.get('operation') ?? '';
			revisedElement = body.get('element') ?? '';
			return { success: true, result: { id: '7x999999' } };
		},
		{
			resource: ['record'],
			operation: ['revise'],
			recordId: ['7x999999'],
			fields: [
				{
					id: '7x1',
					custom_field: 'updated',
					LineItems: [{ productid: '14x456', quantity: '2', listprice: '100.00' }],
				},
			],
		},
	);

	await new VtigerOss().execute.call(context);

	assert.equal(sentOperation, 'revise');
	assert.deepEqual(JSON.parse(revisedElement), {
		id: '7x999999',
		custom_field: 'updated',
		LineItems: [{ productid: '14x456', quantity: '2', listprice: '100.00' }],
	});
});

test('full update calls update with the trusted record ID', async () => {
	let sentOperation = '';
	let updatedElement = '';
	const context = createContext(
		[{ json: {} }],
		async (options) => {
			if (options.qs?.operation === 'getchallenge') {
				return { success: true, result: { token: 'token' } };
			}
			const body = options.body as URLSearchParams;
			if (body.get('operation') === 'login') {
				return { success: true, result: { sessionName: 'session' } };
			}
			sentOperation = body.get('operation') ?? '';
			updatedElement = body.get('element') ?? '';
			return { success: true, result: { id: '7x999999' } };
		},
		{
			resource: ['record'],
			operation: ['update'],
			recordId: ['7x999999'],
			fields: [
				{
					id: '7x1',
					lastname: 'Updated',
					assigned_user_id: '19x1',
					LineItems: [{ productid: '14x456', quantity: '2', listprice: '100.00' }],
				},
			],
		},
	);

	await new VtigerOss().execute.call(context);

	assert.equal(sentOperation, 'update');
	assert.deepEqual(JSON.parse(updatedElement), {
		id: '7x999999',
		lastname: 'Updated',
		assigned_user_id: '19x1',
		LineItems: [{ productid: '14x456', quantity: '2', listprice: '100.00' }],
	});
});

test('generic create includes provided inventory fields and LineItems', async () => {
	let createdElement = '';
	let createBody: URLSearchParams | undefined;
	const context = createContext(
		[{ json: {} }],
		async (options) => {
			if (options.qs?.operation === 'getchallenge') {
				return { success: true, result: { token: 'token' } };
			}
			const body = options.body as URLSearchParams;
			if (body.get('operation') === 'login') {
				return { success: true, result: { sessionName: 'session' } };
			}
			createBody = body;
			createdElement = body.get('element') ?? '';
			return { success: true, result: { id: '4x1' } };
		},
		{
			resource: ['record'],
			operation: ['create'],
			elementType: ['Quotes'],
			fields: [
				{
					subject: 'Example Quote',
					productid: '14x456',
					LineItems: [{ productid: '14x456', quantity: '1', listprice: '100.00' }],
				},
			],
		},
	);

	await new VtigerOss().execute.call(context);

	assert.equal(createBody?.get('operation'), 'create');
	assert.equal(createBody?.get('elementType'), 'Quotes');
	assert.deepEqual(JSON.parse(createdElement), {
		subject: 'Example Quote',
		productid: '14x456',
		LineItems: [{ productid: '14x456', quantity: '1', listprice: '100.00' }],
	});
});

test('emits query records as individual paired items', async () => {
	const context = createContext(
		[{ json: {} }],
		async (options) => {
			if (options.qs?.operation === 'getchallenge') {
				return { success: true, result: { token: 'token' } };
			}
			if ((options.body as URLSearchParams | undefined)?.get('operation') === 'login') {
				return { success: true, result: { sessionName: 'session' } };
			}
			return { success: true, result: [{ id: '12x1' }, { id: '12x2' }] };
		},
		{
			resource: ['query'],
			operation: ['getMany'],
			elementType: ['Contacts'],
			condition: [''],
			orderBy: ['id'],
			returnAll: [false],
			limit: [2],
			pageSize: [100],
		},
	);

	const [output] = await new VtigerOss().execute.call(context);

	assert.deepEqual(
		output.map((item) => item.json.id),
		['12x1', '12x2'],
	);
	assert.deepEqual(
		output.map((item) => item.pairedItem),
		[0, 0],
	);
});

test('routes all relation operations with their registered parameter names', async () => {
	const requests: IHttpRequestOptions[] = [];
	const context = createContext(
		[{ json: {} }, { json: {} }, { json: {} }, { json: {} }],
		async (options) => {
			requests.push(options);
			if (requests.length === 1) return { success: true, result: { token: 'token' } };
			if (requests.length === 2) return { success: true, result: { sessionName: 'session' } };
			return { success: true, result: { ok: true } };
		},
		{
			resource: ['relation', 'relation', 'relation', 'relation'],
			operation: ['listTypes', 'retrieveRelated', 'queryRelated', 'addRelated'],
			relationElementType: ['Accounts'],
			recordId: ['', '11x1', '11x1'],
			relatedType: ['', 'Contacts'],
			relationLabel: ['', 'Contacts', 'Contacts', 'Contacts'],
			relatedQuery: ['', '', 'SELECT * FROM Contacts;;;'],
			sourceRecordId: ['', '', '', '11x1'],
			relatedRecordId: ['', '', '', '12x2'],
		},
	);

	await new VtigerOss().execute.call(context);

	assert.equal(requests[2].qs?.operation, 'relatedtypes');
	assert.equal(requests[2].qs?.elementType, 'Accounts');
	assert.deepEqual(requests[3].qs, {
		id: '11x1',
		relatedType: 'Contacts',
		relatedLabel: 'Contacts',
		operation: 'retrieve_related',
		sessionName: 'session',
	});
	assert.equal(requests[4].qs?.operation, 'query_related');
	assert.equal(requests[4].qs?.query, 'SELECT * FROM Contacts');
	const addBody = requests[5].body as URLSearchParams;
	assert.equal(addBody.get('operation'), 'add_related');
	assert.equal(addBody.get('sourceRecordId'), '11x1');
	assert.equal(addBody.get('relatedRecordId'), '12x2');
	assert.equal(addBody.get('relationIdLabel'), 'Contacts');
});

test('emits retrieved files as native n8n binary data', async () => {
	const context = createContext(
		[{ json: {} }],
		async (options) => {
			if (options.qs?.operation === 'getchallenge') {
				return { success: true, result: { token: 'token' } };
			}
			if ((options.body as URLSearchParams | undefined)?.get('operation') === 'login') {
				return { success: true, result: { sessionName: 'session' } };
			}
			return {
				success: true,
				result: [
					{
						fileid: '456',
						filename: 'test.txt',
						filetype: 'text/plain',
						filesize: 5,
						filecontents: 'aGVsbG8=',
					},
				],
			};
		},
		{
			resource: ['document'],
			operation: ['download'],
			attachmentId: ['15x456'],
			binaryPropertyName: ['attachment'],
			maximumFileSize: [1],
		},
	);

	const [output] = await new VtigerOss().execute.call(context);

	assert.equal(output[0].json.fileName, 'test.txt');
	assert.equal(output[0].binary?.attachment.data, 'aGVsbG8=');
	assert.equal(output[0].pairedItem, 0);
});

test('uploads a Document and links its Document ID to a record', async () => {
	let multipartBody: FormData | undefined;
	let relationBody: URLSearchParams | undefined;
	const context = createContext(
		[
			{
				json: {},
				binary: {
					data: {
						data: Buffer.from('document contents').toString('base64'),
						fileName: 'service-report.pdf',
						mimeType: 'application/pdf',
					},
				},
			},
		],
		async (options) => {
			if (options.qs?.operation === 'getchallenge') {
				return { success: true, result: { token: 'token' } };
			}
			if (options.body instanceof URLSearchParams) {
				if (options.body.get('operation') === 'login') {
					return { success: true, result: { sessionName: 'session' } };
				}
				relationBody = options.body;
				return { success: true, result: true };
			}
			multipartBody = options.body as unknown as FormData;
			return {
				success: true,
				result: {
					id: '15x100',
					imageattachmentids: '15x247',
					notes_title: 'Service Report',
				},
			};
		},
		{
			resource: ['document'],
			operation: ['uploadAndLink'],
			binaryPropertyName: ['data'],
			maximumFileSize: [25],
			documentTitle: ['Service Report'],
			assignedToId: ['19x25'],
			folderId: ['22x1'],
			fileStatus: [true],
			documentFields: [{ notecontent: 'Created by n8n' }],
			sourceRecordId: ['5x456'],
			relationLabel: ['34'],
		},
	);

	const [output] = await new VtigerOss().execute.call(context);

	assert.equal(output[0].json.documentId, '15x100');
	assert.deepEqual(output[0].json.attachmentDownloadIds, ['15x247']);
	assert.equal(multipartBody?.get('elementType'), 'Documents');
	assert.equal(multipartBody?.get('filename_hidden'), 'service-report.pdf');
	const uploadedFile = multipartBody?.get('filename') as File;
	assert.equal(uploadedFile.name, 'service-report.pdf');
	assert.equal(uploadedFile.type, 'application/pdf');
	assert.equal(await uploadedFile.text(), 'document contents');
	assert.equal(relationBody?.get('operation'), 'add_related');
	assert.equal(relationBody?.get('sourceRecordId'), '5x456');
	assert.equal(relationBody?.get('relatedRecordId'), '15x100');
	assert.equal(relationBody?.get('relationIdLabel'), '34');
});

test('sends lead conversion only as a modern encoded element', async () => {
	let conversionBody: URLSearchParams | undefined;
	const context = createContext(
		[{ json: {} }],
		async (options) => {
			if (options.qs?.operation === 'getchallenge') {
				return { success: true, result: { token: 'token' } };
			}
			const body = options.body as URLSearchParams;
			if (body.get('operation') === 'login') {
				return { success: true, result: { sessionName: 'session' } };
			}
			conversionBody = body;
			return { success: true, result: { Accounts: '11x2', Contacts: '12x3' } };
		},
		{
			resource: ['lead'],
			operation: ['convert'],
			leadId: ['10x1'],
			assignedTo: ['19x1'],
			createAccount: [true],
			accountName: ['Test Account'],
			accountFields: [{}],
			createContact: [true],
			contactLastName: ['Test Contact'],
			contactFields: [{}],
			createPotential: [false],
			potentialName: [''],
			potentialFields: [{}],
			transferRelatedRecordsTo: ['Contacts'],
		},
	);

	const [output] = await new VtigerOss().execute.call(context);

	assert.equal(conversionBody?.get('operation'), 'convertlead');
	assert.ok(conversionBody?.get('element'));
	assert.equal(conversionBody?.has('leadId'), false);
	assert.equal(output[0].json.Contacts, '12x3');
});

test('routes custom GET and POST without allowing reserved parameter replacement', async () => {
	const requests: IHttpRequestOptions[] = [];
	const context = createContext(
		[{ json: {} }, { json: {} }],
		async (options) => {
			requests.push(options);
			if (requests.length === 1) return { success: true, result: { token: 'token' } };
			if (requests.length === 2) return { success: true, result: { sessionName: 'session' } };
			return { success: true, result: { ok: true } };
		},
		{
			resource: ['advanced', 'advanced'],
			operation: ['customGet', 'customPost'],
			customOperation: ['mobile.query', 'wsapp_put'],
			customParameters: [{ query: 'SELECT * FROM Contacts;' }, { element: { id: '12x1' } }],
		},
	);

	await new VtigerOss().execute.call(context);

	assert.equal(requests[2].method, 'GET');
	assert.equal(requests[2].qs?.operation, 'mobile.query');
	assert.equal(requests[2].qs?.sessionName, 'session');
	const postBody = requests[3].body as URLSearchParams;
	assert.equal(postBody.get('operation'), 'wsapp_put');
	assert.equal(postBody.get('sessionName'), 'session');
	assert.equal(postBody.get('element'), '{"id":"12x1"}');
});
