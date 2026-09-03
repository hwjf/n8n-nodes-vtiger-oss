import type { IDataObject, IHttpRequestOptions } from 'n8n-workflow';

class IntegrationHttpError extends Error {
	constructor(public readonly httpCode: number) {
		super(`HTTP request failed with status ${httpCode}`);
	}
}

function addQueryParameters(url: URL, parameters: IDataObject | undefined): void {
	if (!parameters) return;

	for (const [name, value] of Object.entries(parameters)) {
		if (value !== undefined && value !== null) url.searchParams.set(name, String(value));
	}
}

export async function integrationHttpRequest(options: IHttpRequestOptions): Promise<unknown> {
	const url = new URL(options.url);
	addQueryParameters(url, options.qs);

	const headers = new Headers();
	for (const [name, value] of Object.entries(options.headers ?? {})) {
		if (value !== undefined && value !== null) headers.set(name, String(value));
	}
	let body: URLSearchParams | FormData | undefined;
	if (options.body instanceof URLSearchParams) {
		body = options.body;
	} else if (options.body instanceof FormData) {
		body = options.body;
	}

	const response = await fetch(url, {
		method: options.method,
		headers,
		body,
		signal: AbortSignal.timeout(options.timeout ?? 30000),
	});

	if (!response.ok) throw new IntegrationHttpError(response.status);
	return await response.json();
}
