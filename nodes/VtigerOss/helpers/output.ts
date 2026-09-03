import type { IDataObject } from 'n8n-workflow';
import { VtigerApiError } from '../transport/errors';

export type OutputMode = 'raw' | 'selected' | 'simplified';

const OUTPUT_ACTIONS = new Set([
	'advanced.customGet',
	'advanced.customPost',
	'metadata.describe',
	'metadata.listTypes',
	'query.getMany',
	'query.rawQuery',
	'record.create',
	'record.retrieve',
	'record.revise',
	'record.update',
	'relation.listTypes',
	'relation.queryRelated',
	'relation.retrieveRelated',
]);

const PREFERRED_FIELDS = [
	'id',
	'label',
	'name',
	'firstname',
	'lastname',
	'email',
	'phone',
	'assigned_user_id',
	'createdtime',
	'modifiedtime',
];

export function actionSupportsOutput(resource: string, operation: string): boolean {
	return OUTPUT_ACTIONS.has(`${resource}.${operation}`);
}

function selectFields(data: IDataObject, fields: string[]): IDataObject {
	return Object.fromEntries(
		fields
			.filter((field) => Object.prototype.hasOwnProperty.call(data, field))
			.map((field) => [field, data[field]]),
	) as IDataObject;
}

export function parseSelectedFields(value: unknown): string[] {
	const fields = String(value ?? '')
		.split(',')
		.map((field) => field.trim())
		.filter(Boolean);
	const uniqueFields = [...new Set(fields)];
	if (uniqueFields.length === 0) {
		throw new VtigerApiError('Fields to Include must contain at least one field name', 'output');
	}
	return uniqueFields;
}

export function formatOutput(
	data: IDataObject,
	mode: OutputMode,
	selectedFields: string[] = [],
): IDataObject {
	if (mode === 'raw') return data;
	if (mode === 'selected') return selectFields(data, selectedFields);
	if (mode !== 'simplified') throw new VtigerApiError('Output mode is invalid', 'output');

	const keys = Object.keys(data);
	const preferred = PREFERRED_FIELDS.filter((field) => keys.includes(field));
	const remaining = keys.filter((field) => !preferred.includes(field));
	return selectFields(data, [...preferred, ...remaining].slice(0, 10));
}
