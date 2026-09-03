/* eslint-disable @n8n/community-nodes/no-restricted-globals, @n8n/community-nodes/no-restricted-imports */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { IExecuteFunctions } from 'n8n-workflow';
import {
	buildDocumentElement,
	linkUploadedDocument,
	normalizeUploadedDocument,
} from '../../nodes/VtigerOss/helpers/document';
import type { UploadedDocument } from '../../nodes/VtigerOss/helpers/document';
import { VtigerClient } from '../../nodes/VtigerOss/transport/client';
import { parseRetrievedFiles } from '../../nodes/VtigerOss/helpers/file';
import { encodeElement } from '../../nodes/VtigerOss/helpers/serialization';
import { integrationHttpRequest } from './httpRequest';

function requiredEnvironment(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`Required integration test variable ${name} is missing`);
	return value;
}

async function createClient(): Promise<VtigerClient> {
	const context = {
		getCredentials: async () => ({
			baseUrl: requiredEnvironment('VTIGER_BASE_URL'),
			username: requiredEnvironment('VTIGER_USERNAME'),
			apiKey: requiredEnvironment('VTIGER_ACCESS_KEY'),
			allowInsecureHttp: process.env.VTIGER_ALLOW_INSECURE_HTTP === 'true',
		}),
		helpers: { httpRequest: integrationHttpRequest },
	} as unknown as IExecuteFunctions;

	return await VtigerClient.create(context);
}

async function uploadDocumentFixture(
	client: VtigerClient,
	marker: string,
): Promise<UploadedDocument> {
	const folders = await client.request<Array<Record<string, unknown>>>({
		method: 'GET',
		operation: 'query',
		parameters: { query: 'SELECT * FROM DocumentFolders;' },
	});
	assert.ok(folders.length > 0, 'The test user needs access to a Document Folder');

	const fileName = `${marker}.txt`;
	const result = await client.requestMultipart({
		operation: 'create',
		parameters: {
			elementType: 'Documents',
			element: encodeElement(
				buildDocumentElement({
					title: marker,
					fileName,
					assignedToId: String(client.getSessionMetadata().userId ?? ''),
					folderId: String(folders[0].id ?? ''),
					fileStatus: true,
					additionalFields: {},
				}),
			),
			filename_hidden: fileName,
		},
		file: {
			fieldName: 'filename',
			data: Buffer.from('n8n Vtiger Document integration test\n'),
			fileName,
			mimeType: 'text/plain',
		},
	});
	return normalizeUploadedDocument(result);
}

async function deleteRecord(client: VtigerClient, id: string): Promise<void> {
	await client.request({ method: 'POST', operation: 'delete', parameters: { id } });
}

test('lists accessible vtiger modules', async () => {
	const client = await createClient();
	const result = await client.request<Record<string, unknown>>({
		method: 'GET',
		operation: 'listtypes',
	});

	assert.ok(Array.isArray(result.types));
	assert.ok(result.types.length > 0);
});

test('describes a vtiger module', async () => {
	const client = await createClient();
	const elementType = process.env.VTIGER_TEST_MODULE || 'Contacts';
	const description = await client.request<Record<string, unknown>>({
		method: 'GET',
		operation: 'describe',
		parameters: { elementType },
	});

	assert.equal(typeof description, 'object');
	assert.ok(Array.isArray(description.fields));
});

test('lists relation types for a vtiger module', async () => {
	const client = await createClient();
	const elementType = process.env.VTIGER_TEST_MODULE || 'Contacts';
	const relations = await client.request<Record<string, unknown>>({
		method: 'GET',
		operation: 'relatedtypes',
		parameters: { elementType },
	});

	assert.ok(Array.isArray(relations.types));
	assert.ok(relations.types.length > 0);
});

test(
	'retrieves an optional test record',
	{ skip: !process.env.VTIGER_TEST_RECORD_ID },
	async () => {
		const client = await createClient();
		const id = requiredEnvironment('VTIGER_TEST_RECORD_ID');
		const record = await client.request<Record<string, unknown>>({
			method: 'GET',
			operation: 'retrieve',
			parameters: { id },
		});

		assert.equal(record.id, id);
	},
);

test(
	'retrieves optional inventory line items',
	{ skip: !process.env.VTIGER_TEST_INVENTORY_ID },
	async () => {
		const client = await createClient();
		const id = requiredEnvironment('VTIGER_TEST_INVENTORY_ID');
		const record = await client.request<Record<string, unknown>>({
			method: 'GET',
			operation: 'retrieve',
			parameters: { id },
		});

		assert.equal(record.id, id);
		assert.ok(Array.isArray(record.LineItems));
	},
);

test(
	'retrieves an optional attachment',
	{ skip: !process.env.VTIGER_TEST_ATTACHMENT_ID },
	async () => {
		const client = await createClient();
		const id = requiredEnvironment('VTIGER_TEST_ATTACHMENT_ID');
		const result = await client.request({
			method: 'GET',
			operation: 'files_retrieve',
			parameters: { id },
		});

		const files = parseRetrievedFiles(result, 25 * 1024 * 1024);
		assert.ok(files.length > 0);
	},
);

test(
	'uploads, retrieves, and deletes a Document fixture',
	{ skip: process.env.VTIGER_RUN_DOCUMENT_TESTS !== 'true' },
	async () => {
		const client = await createClient();
		const marker = `n8n-vtiger-document-test-${Date.now()}`;
		let documentId: string | undefined;

		try {
			const uploaded = await uploadDocumentFixture(client, marker);
			documentId = uploaded.documentId;

			const document = await client.request<Record<string, unknown>>({
				method: 'GET',
				operation: 'retrieve',
				parameters: { id: documentId },
			});
			assert.equal(document.id, documentId);
			assert.equal(document.notes_title, marker);
			assert.ok(uploaded.attachmentDownloadIds.length > 0);
		} finally {
			if (documentId) await deleteRecord(client, documentId);
		}
	},
);

test(
	'uploads, links, verifies, and deletes a Document fixture',
	{ skip: process.env.VTIGER_RUN_DOCUMENT_LINK_TESTS !== 'true' },
	async () => {
		const client = await createClient();
		const sourceRecordId = requiredEnvironment('VTIGER_TEST_DOCUMENT_LINK_RECORD_ID');
		const relatedListLabel = process.env.VTIGER_TEST_DOCUMENT_RELATION_LABEL || 'Documents';
		const marker = `n8n-vtiger-document-link-test-${Date.now()}`;
		let documentId: string | undefined;

		try {
			const uploaded = await uploadDocumentFixture(client, marker);
			documentId = uploaded.documentId;
			await linkUploadedDocument(client, documentId, sourceRecordId, relatedListLabel);

			const related = await client.request<Array<Record<string, unknown>>>({
				method: 'GET',
				operation: 'retrieve_related',
				parameters: {
					id: sourceRecordId,
					relatedType: 'Documents',
					relatedLabel: relatedListLabel,
				},
			});
			assert.ok(related.some((record) => record.id === documentId));
		} finally {
			if (documentId) await deleteRecord(client, documentId);
		}
	},
);
