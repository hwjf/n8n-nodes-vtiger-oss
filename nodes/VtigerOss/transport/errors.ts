import type { VtigerErrorData, VtigerResponse } from './types';

export class VtigerApiError extends Error {
	constructor(
		message: string,
		public readonly operation: string,
		public readonly code?: string,
		public readonly statusCode?: number,
	) {
		super(message);
		this.name = 'VtigerApiError';
	}
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asErrorData(value: unknown): VtigerErrorData | undefined {
	if (!isObject(value)) return undefined;

	return {
		code: typeof value.code === 'string' ? value.code : undefined,
		message: typeof value.message === 'string' ? value.message : undefined,
	};
}

export function unwrapVtigerResponse<T>(response: unknown, operation: string): T {
	if (!isObject(response) || typeof response.success !== 'boolean') {
		throw new VtigerApiError(`Unexpected response from Vtiger operation "${operation}"`, operation);
	}

	const envelope = response as unknown as VtigerResponse<T>;
	if (!envelope.success) {
		const error = asErrorData(envelope.error);
		throw new VtigerApiError(
			error?.message || `Vtiger operation "${operation}" failed`,
			operation,
			error?.code,
		);
	}

	if (!Object.prototype.hasOwnProperty.call(response, 'result')) {
		throw new VtigerApiError(`Vtiger operation "${operation}" returned no result`, operation);
	}

	return envelope.result as T;
}

export function requestFailure(
	operation: string,
	error: unknown,
	compatibilityHint?: string,
): VtigerApiError {
	const httpCode =
		typeof error === 'object' &&
		error !== null &&
		'httpCode' in error &&
		(typeof error.httpCode === 'number' || typeof error.httpCode === 'string')
			? error.httpCode
			: undefined;
	const parsedStatusCode = typeof httpCode === 'string' ? Number(httpCode) : httpCode;
	const statusCode = Number.isFinite(parsedStatusCode) ? parsedStatusCode : undefined;

	const hint =
		(statusCode === undefined || statusCode === 500) && compatibilityHint
			? `. Compatibility note: ${compatibilityHint}.`
			: '';
	return new VtigerApiError(
		`Request for Vtiger operation "${operation}" failed${hint}`,
		operation,
		undefined,
		statusCode,
	);
}
