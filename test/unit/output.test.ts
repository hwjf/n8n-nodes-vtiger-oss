/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	actionSupportsOutput,
	formatOutput,
	parseSelectedFields,
} from '../../nodes/VtigerOss/helpers/output';

test('simplifies output to ten fields while prioritizing identity fields', () => {
	const data: Record<string, unknown> = Object.fromEntries(
		Array.from({ length: 12 }, (_, index) => [`custom_${index + 1}`, index + 1]),
	);
	data.id = '12x1';
	data.lastname = 'Smith';

	assert.deepEqual(Object.keys(formatOutput(data, 'simplified')), [
		'id',
		'lastname',
		'custom_1',
		'custom_2',
		'custom_3',
		'custom_4',
		'custom_5',
		'custom_6',
		'custom_7',
		'custom_8',
	]);
});

test('returns raw output or explicitly selected fields', () => {
	const data = { id: '12x1', firstname: 'Jane', lastname: 'Smith' };
	assert.equal(formatOutput(data, 'raw'), data);
	assert.deepEqual(formatOutput(data, 'selected', ['lastname', 'id']), {
		lastname: 'Smith',
		id: '12x1',
	});
	assert.deepEqual(parseSelectedFields(' lastname, id, lastname '), ['lastname', 'id']);
	assert.throws(() => parseSelectedFields(' , '), /at least one field name/);
	assert.throws(() => formatOutput(data, 'invalid' as 'raw'), /Output mode is invalid/);
	assert.equal(actionSupportsOutput('record', 'retrieve'), true);
	assert.equal(actionSupportsOutput('record', 'delete'), false);
});
