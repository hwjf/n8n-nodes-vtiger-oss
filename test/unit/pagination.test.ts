/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeQuery, queryWithPagination } from '../../nodes/VtigerOss/helpers/pagination';
import type { VtigerClient } from '../../nodes/VtigerOss/transport/client';

test('paginates VTQL in pages of at most 100', async () => {
	const queries: string[] = [];
	const records = Array.from({ length: 230 }, (_, index) => ({ id: `12x${index + 1}` }));
	const client = {
		request: async ({ parameters }: { parameters: { query: string } }) => {
			const query = parameters.query;
			queries.push(query);
			const match = /LIMIT (\d+), (\d+);$/.exec(query);
			assert.ok(match);
			const offset = Number(match[1]);
			const limit = Number(match[2]);
			return records.slice(offset, offset + limit);
		},
	} as unknown as VtigerClient;

	const result = await queryWithPagination(client, 'SELECT * FROM Contacts ORDER BY id;', {
		returnAll: true,
		limit: 1,
		pageSize: 100,
	});

	assert.equal(result.length, 230);
	assert.deepEqual(queries, [
		'SELECT * FROM Contacts ORDER BY id LIMIT 0, 100;',
		'SELECT * FROM Contacts ORDER BY id LIMIT 100, 100;',
		'SELECT * FROM Contacts ORDER BY id LIMIT 200, 100;',
	]);
});

test('honors a finite limit across pages', async () => {
	let calls = 0;
	const client = {
		request: async () => {
			calls++;
			return Array.from({ length: calls === 1 ? 40 : 15 }, (_, index) => ({ id: index }));
		},
	} as unknown as VtigerClient;

	const result = await queryWithPagination(client, 'SELECT * FROM Contacts ORDER BY id', {
		returnAll: false,
		limit: 55,
		pageSize: 40,
	});

	assert.equal(result.length, 55);
	assert.equal(calls, 2);
});

test('requires stable ordering for multi-page queries and controls LIMIT', () => {
	assert.throws(() => normalizeQuery('SELECT * FROM Contacts', true), /ORDER BY/);
	assert.throws(
		() => normalizeQuery('SELECT * FROM Contacts ORDER BY id LIMIT 10', false),
		/Do not include LIMIT/,
	);
	assert.throws(() => normalizeQuery('DELETE FROM Contacts', false), /start with SELECT/);
	assert.throws(
		() => normalizeQuery('SELECT * FROM Contacts; DELETE FROM Contacts', false),
		/exactly one statement/,
	);
	assert.equal(
		normalizeQuery("SELECT * FROM Contacts WHERE description = 'Call; email';", false),
		"SELECT * FROM Contacts WHERE description = 'Call; email'",
	);
	assert.equal(
		normalizeQuery('SELECT * FROM Contacts LIMIT 5', false, true),
		'SELECT * FROM Contacts LIMIT 5',
	);
	assert.equal(
		normalizeQuery("SELECT * FROM Contacts WHERE description = 'no limit'", false),
		"SELECT * FROM Contacts WHERE description = 'no limit'",
	);
	assert.throws(
		() => normalizeQuery("SELECT * FROM Contacts WHERE description = 'order by'", true),
		/ORDER BY/,
	);
});

test('rejects invalid pagination numbers before requesting data', async () => {
	let calls = 0;
	const client = {
		request: async () => {
			calls++;
			return [];
		},
	} as unknown as VtigerClient;

	for (const pageSize of [Number.NaN, Infinity, -Infinity, 0, -1, 1.5, 101]) {
		await assert.rejects(
			queryWithPagination(client, 'SELECT * FROM Contacts', {
				returnAll: false,
				limit: 1,
				pageSize,
			}),
			/Page Size/,
		);
	}
	for (const limit of [Number.NaN, Infinity, -Infinity, 0, -1, 1.5]) {
		await assert.rejects(
			queryWithPagination(client, 'SELECT * FROM Contacts', {
				returnAll: false,
				limit,
				pageSize: 100,
			}),
			/Limit/,
		);
	}

	assert.equal(calls, 0);
});
