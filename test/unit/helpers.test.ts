/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { encodeElement, parseJsonObject } from '../../nodes/VtigerOss/helpers/serialization';
import { validateWebserviceId } from '../../nodes/VtigerOss/helpers/webserviceId';

test('parses and encodes vtiger elements', () => {
	const element = parseJsonObject('{"subject":"Invoice"}', 'Fields');
	assert.equal(encodeElement(element), '{"subject":"Invoice"}');
});

test('rejects invalid encoded values', () => {
	assert.throws(() => parseJsonObject('{', 'Fields'));
	assert.throws(() => parseJsonObject([], 'Fields'));
});

test('validates webservice IDs', () => {
	assert.equal(validateWebserviceId('12x345'), '12x345');
	for (const invalid of ['345', '0x1', '12x0', '12X345', '12x']) {
		assert.throws(() => validateWebserviceId(invalid));
	}
});
