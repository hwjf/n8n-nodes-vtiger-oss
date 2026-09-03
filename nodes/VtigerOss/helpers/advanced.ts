import type { IDataObject } from 'n8n-workflow';
import { VtigerApiError } from '../transport/errors';
import { parseJsonObject } from './serialization';

const OPERATION_NAME = /^[A-Za-z][A-Za-z0-9_.]*$/;
const FORBIDDEN_OPERATIONS = new Set(['getchallenge', 'login']);

export function validateCustomOperation(value: string): string {
	const operation = value.trim();
	if (!OPERATION_NAME.test(operation)) {
		throw new VtigerApiError('Custom operation name is invalid', 'advanced');
	}
	if (FORBIDDEN_OPERATIONS.has(operation.toLowerCase())) {
		throw new VtigerApiError(
			'Authentication operations cannot be invoked as custom operations',
			'advanced',
		);
	}
	return operation;
}

export function serializeCustomParameters(value: unknown): IDataObject {
	const parameters = parseJsonObject(value, 'Parameters');
	for (const reserved of ['operation', 'sessionName']) {
		if (Object.keys(parameters).some((name) => name.toLowerCase() === reserved.toLowerCase())) {
			throw new VtigerApiError(
				`Parameters must not contain reserved field "${reserved}"`,
				'advanced',
			);
		}
	}

	return Object.fromEntries(
		Object.entries(parameters).map(([name, parameter]) => [
			name,
			typeof parameter === 'object' && parameter !== null ? JSON.stringify(parameter) : parameter,
		]),
	) as IDataObject;
}
