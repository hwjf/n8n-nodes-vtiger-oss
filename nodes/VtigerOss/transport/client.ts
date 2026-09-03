import type { IDataObject, IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { authenticate, parseCredentials } from './authentication';
import { getCompatibilityHint } from './compatibility';
import { requestFailure, unwrapVtigerResponse } from './errors';
import type {
	VtigerMultipartRequest,
	VtigerOperationRequest,
	VtigerRequest,
	VtigerSession,
} from './types';

export class VtigerClient {
	private constructor(
		private readonly requestFn: VtigerRequest,
		private readonly url: string,
		private readonly session: VtigerSession,
	) {}

	static async create(context: IExecuteFunctions): Promise<VtigerClient> {
		const credentialData = await context.getCredentials('vtigerOssApi');
		const credentials = parseCredentials(credentialData);
		const request: VtigerRequest = async (options) => await context.helpers.httpRequest(options);
		const session = await authenticate(request, credentials);

		return new VtigerClient(request, `${credentials.baseUrl}/webservice.php`, session);
	}

	async request<T>({ method, operation, parameters = {} }: VtigerOperationRequest): Promise<T> {
		const options: IHttpRequestOptions = {
			method,
			url: this.url,
			json: true,
			timeout: 30000,
		};

		if (method === 'GET') {
			options.qs = {
				...parameters,
				operation,
				sessionName: this.session.sessionName,
			};
		} else {
			const body = new URLSearchParams();
			for (const [name, value] of Object.entries(parameters)) {
				body.set(name, String(value));
			}
			body.set('operation', operation);
			body.set('sessionName', this.session.sessionName);
			options.headers = { 'content-type': 'application/x-www-form-urlencoded' };
			options.body = body;
		}

		return await this.execute<T>(operation, options);
	}

	async requestMultipart<T>({
		operation,
		parameters = {},
		file,
	}: VtigerMultipartRequest): Promise<T> {
		const body = new FormData();
		for (const [name, value] of Object.entries(parameters)) {
			if (['operation', 'sessionname'].includes(name.toLowerCase())) continue;
			if (value !== undefined && value !== null) body.append(name, String(value));
		}
		body.append('operation', operation);
		body.append('sessionName', this.session.sessionName);
		body.append(
			file.fieldName,
			new Blob([file.data], { type: file.mimeType || 'application/octet-stream' }),
			file.fileName,
		);

		return await this.execute<T>(operation, {
			method: 'POST',
			url: this.url,
			body: body as unknown as IHttpRequestOptions['body'],
			json: true,
			timeout: 300000,
		});
	}

	private async execute<T>(operation: string, options: IHttpRequestOptions): Promise<T> {
		let response: unknown;
		try {
			response = await this.requestFn(options);
		} catch (error) {
			throw requestFailure(
				operation,
				error,
				getCompatibilityHint(operation, this.session.vtigerVersion),
			);
		}

		return unwrapVtigerResponse<T>(response, operation);
	}

	getSessionMetadata(): IDataObject {
		const { userId, version, vtigerVersion } = this.session;
		return { userId, version, vtigerVersion };
	}
}
