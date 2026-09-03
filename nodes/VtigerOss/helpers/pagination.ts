import type { IDataObject } from 'n8n-workflow';
import type { VtigerClient } from '../transport/client';
import { VtigerApiError } from '../transport/errors';

const MAX_PAGE_SIZE = 100;

export interface PaginationOptions {
	returnAll: boolean;
	limit: number;
	pageSize: number;
}

function inspectQuery(query: string): { containsStatementSeparator: boolean; searchable: string } {
	let quote = '';
	let searchable = '';
	for (let index = 0; index < query.length; index++) {
		const character = query[index];
		if (quote) {
			searchable += ' ';
			if (character === '\\') {
				index++;
				searchable += ' ';
			} else if (character === quote) {
				if (query[index + 1] === quote) {
					index++;
					searchable += ' ';
				} else quote = '';
			}
		} else if (character === "'" || character === '"') {
			quote = character;
			searchable += ' ';
		} else if (character === ';') {
			return { containsStatementSeparator: true, searchable };
		} else {
			searchable += character;
		}
	}
	return { containsStatementSeparator: false, searchable };
}

export function normalizeQuery(
	query: string,
	requireStableOrder: boolean,
	allowLimit = false,
): string {
	const normalized = query.trim().replace(/;+$/, '');
	const inspection = inspectQuery(normalized);
	if (inspection.containsStatementSeparator) {
		throw new VtigerApiError('VTQL query must contain exactly one statement', 'query');
	}
	if (!/^select\s+/i.test(normalized)) {
		throw new VtigerApiError('VTQL query must start with SELECT', 'query');
	}
	if (!allowLimit && /\blimit\b/i.test(inspection.searchable)) {
		throw new VtigerApiError('Do not include LIMIT; pagination adds it automatically', 'query');
	}
	if (requireStableOrder && !/\border\s+by\b/i.test(inspection.searchable)) {
		throw new VtigerApiError('Paginated VTQL queries require an ORDER BY clause', 'query');
	}

	return normalized;
}

export async function queryWithPagination(
	client: VtigerClient,
	query: string,
	options: PaginationOptions,
): Promise<IDataObject[]> {
	if (
		!Number.isSafeInteger(options.pageSize) ||
		options.pageSize < 1 ||
		options.pageSize > MAX_PAGE_SIZE
	) {
		throw new VtigerApiError('Page Size must be an integer between 1 and 100', 'query');
	}
	if (!Number.isSafeInteger(options.limit) || options.limit < 1) {
		throw new VtigerApiError('Limit must be a positive integer', 'query');
	}

	const { pageSize, limit } = options;
	const requiresMultiplePages = options.returnAll || limit > pageSize;
	const baseQuery = normalizeQuery(query, requiresMultiplePages);
	const records: IDataObject[] = [];
	let offset = 0;

	while (records.length === offset) {
		const remaining = options.returnAll ? pageSize : Math.min(pageSize, limit - records.length);
		const page = await client.request<unknown[]>({
			method: 'GET',
			operation: 'query',
			parameters: { query: `${baseQuery} LIMIT ${offset}, ${remaining};` },
		});

		if (!Array.isArray(page)) {
			throw new VtigerApiError('Vtiger query returned an unexpected result', 'query');
		}

		for (const record of page) {
			if (typeof record !== 'object' || record === null || Array.isArray(record)) {
				throw new VtigerApiError('Vtiger query returned a non-record result', 'query');
			}
			records.push(record as IDataObject);
		}

		offset += page.length;
		if (page.length < remaining || (!options.returnAll && records.length >= limit)) break;
	}

	return options.returnAll ? records : records.slice(0, limit);
}
