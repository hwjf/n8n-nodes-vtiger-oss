import type { IDataObject } from 'n8n-workflow';
import { VtigerApiError } from '../transport/errors';

export function parseJsonObject(value: unknown, parameterName: string): IDataObject {
	let parsed = value;
	if (typeof value === 'string') {
		try {
			parsed = JSON.parse(value);
		} catch {
			// This helper has no n8n execution context; the caller wraps the domain error.
			// eslint-disable-next-line @n8n/community-nodes/require-node-api-error
			throw new VtigerApiError(`${parameterName} must contain valid JSON`, 'serialization');
		}
	}

	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		throw new VtigerApiError(`${parameterName} must be a JSON object`, 'serialization');
	}

	return parsed as IDataObject;
}

export function encodeElement(element: IDataObject): string {
	return JSON.stringify(element);
}
