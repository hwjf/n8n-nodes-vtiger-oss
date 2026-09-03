import type {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IHttpRequestOptions,
	INodeCredentialTestResult,
} from 'n8n-workflow';
import { authenticate, parseCredentials } from './authentication';
import { unwrapVtigerResponse } from './errors';

export async function testVtigerCredentials(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted<ICredentialDataDecryptedObject>,
): Promise<INodeCredentialTestResult> {
	try {
		const credentials = parseCredentials(credential.data ?? {});
		const helpers = this.helpers as typeof this.helpers & {
			httpRequest: (options: IHttpRequestOptions) => Promise<unknown>;
		};
		const request = async (options: IHttpRequestOptions) => await helpers.httpRequest(options);
		const session = await authenticate(request, credentials);
		const response = await request({
			method: 'GET',
			url: `${credentials.baseUrl}/webservice.php`,
			qs: { operation: 'listtypes', sessionName: session.sessionName },
			json: true,
			timeout: 30000,
		});
		unwrapVtigerResponse(response, 'listtypes');

		return { status: 'OK', message: 'Connection successful' };
	} catch (error) {
		return {
			status: 'Error',
			message: error instanceof Error ? error.message : 'Credential test failed',
		};
	}
}
