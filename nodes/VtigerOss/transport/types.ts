import type { IDataObject, IHttpRequestMethods, IHttpRequestOptions } from 'n8n-workflow';

export interface VtigerCredentials {
	baseUrl: string;
	username: string;
	apiKey: string;
	allowInsecureHttp: boolean;
}

export interface VtigerErrorData {
	code?: string;
	message?: string;
}

export interface VtigerResponse<T> {
	success: boolean;
	result?: T;
	error?: VtigerErrorData;
}

export interface VtigerSession extends IDataObject {
	sessionName: string;
	userId?: string;
	version?: string;
	vtigerVersion?: string;
}

export type VtigerRequest = (options: IHttpRequestOptions) => Promise<unknown>;

export interface VtigerOperationRequest {
	method: IHttpRequestMethods;
	operation: string;
	parameters?: IDataObject;
}

export interface VtigerMultipartRequest {
	operation: string;
	parameters?: IDataObject;
	file: {
		fieldName: string;
		data: Buffer;
		fileName: string;
		mimeType?: string;
	};
}
