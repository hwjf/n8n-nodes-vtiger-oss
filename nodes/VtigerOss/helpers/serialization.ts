import type { IDataObject } from 'n8n-workflow';
import { VtigerApiError } from '../transport/errors';

export function parseJsonObject(value: unknown, parameterName: string): IDataObject {
	let parsed = value;
	if (typeof value === 'string') {
		let invalidJson = false;
		try {
			parsed = JSON.parse(value);
		} catch {
			invalidJson = true;
		}
		if (invalidJson) {
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
