/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { maximumFileSizeInBytes, parseRetrievedFiles } from '../../nodes/VtigerOss/helpers/file';

test('decodes vtiger file results and validates metadata', () => {
	const [file] = parseRetrievedFiles(
		[
			{
				fileid: '456',
				filename: 'test.txt',
				filetype: 'text/plain',
				filesize: 5,
				filecontents: 'aGVsbG8=',
			},
		],
		1024,
	);

	assert.equal(file.fileName, 'test.txt');
	assert.equal(file.mimeType, 'text/plain');
	assert.equal(file.data.toString(), 'hello');
});

test('rejects malformed, mismatched, and oversized files', () => {
	const base = {
		fileid: '456',
		filename: 'test.txt',
		filetype: 'text/plain',
		filesize: 5,
		filecontents: 'aGVsbG8=',
	};
	assert.throws(() => parseRetrievedFiles([{ ...base, filecontents: '***' }], 1024), /base64/);
	assert.throws(() => parseRetrievedFiles([{ ...base, filesize: 4 }], 1024), /does not match/);
	assert.throws(() => parseRetrievedFiles([base], 4), /maximum download size/);
	assert.throws(
		() =>
			parseRetrievedFiles(
				[{ ...base, filesize: 1, filecontents: Buffer.alloc(1024).toString('base64') }],
				5,
			),
		/encoded content/,
	);
});

test('validates configured and aggregate download sizes', () => {
	for (const value of [Number.NaN, Infinity, -Infinity, 0, -1, 101, '25']) {
		assert.throws(() => maximumFileSizeInBytes(value), /Maximum Download Size/);
	}
	assert.equal(maximumFileSizeInBytes(1), 1024 * 1024);
	assert.equal(maximumFileSizeInBytes(100), 100 * 1024 * 1024);
	assert.throws(() => parseRetrievedFiles([], Number.NaN), /download size is invalid/);

	const files = [
		{
			fileid: '1',
			filename: 'one.txt',
			filesize: 3,
			filecontents: 'b25l',
		},
		{
			fileid: '2',
			filename: 'two.txt',
			filesize: 3,
			filecontents: 'dHdv',
		},
	];
	assert.throws(() => parseRetrievedFiles(files, 5), /maximum download size/);
	assert.deepEqual(
		parseRetrievedFiles(files, 6).map((file) => file.data.toString()),
		['one', 'two'],
	);
});
