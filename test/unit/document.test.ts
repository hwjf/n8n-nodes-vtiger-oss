/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	assertUploadSize,
	buildDocumentElement,
	normalizeUploadedDocument,
	validateUploadFileName,
} from '../../nodes/VtigerOss/helpers/document';

test('builds protected internal Document fields', () => {
	assert.deepEqual(
		buildDocumentElement({
			title: '',
			fileName: 'service-report.pdf',
			assignedToId: '19x25',
			folderId: '22x1',
			fileStatus: true,
			additionalFields: { notecontent: 'Created by n8n' },
		}),
		{
			notecontent: 'Created by n8n',
			notes_title: 'service-report.pdf',
			assigned_user_id: '19x25',
			filelocationtype: 'I',
			filestatus: 1,
			folderid: '22x1',
		},
	);
	assert.throws(
		() =>
			buildDocumentElement({
				title: 'Test',
				fileName: 'test.pdf',
				assignedToId: '19x25',
				folderId: '22x1',
				fileStatus: true,
				additionalFields: { NOTES_TITLE: 'Override' },
			}),
		/protected Document field/,
	);
});

test('separates Document and Attachment download IDs', () => {
	assert.deepEqual(
		normalizeUploadedDocument({
			id: '15x100',
			imageattachmentids: '15x247, 15x248',
			notes_title: 'Test',
		}),
		{
			documentId: '15x100',
			attachmentDownloadIds: ['15x247', '15x248'],
			document: {
				id: '15x100',
				imageattachmentids: '15x247, 15x248',
				notes_title: 'Test',
			},
		},
	);
	assert.equal(validateUploadFileName('test.pdf'), 'test.pdf');
	assert.throws(() => validateUploadFileName('../test.pdf'), /valid file name/);
	assert.throws(() => assertUploadSize(0, 1024), /must not be empty/);
	assert.throws(() => assertUploadSize(1025, 1024), /maximum upload size/);
	assert.doesNotThrow(() => assertUploadSize(1024, 1024));
});
