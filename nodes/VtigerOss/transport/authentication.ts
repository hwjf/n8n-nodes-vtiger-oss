import { createHash } from 'node:crypto';
import type { IDataObject } from 'n8n-workflow';
import { requestFailure, unwrapVtigerResponse, VtigerApiError } from './errors';
import type { VtigerCredentials, VtigerRequest, VtigerSession } from './types';

interface ChallengeResult extends IDataObject {
	token: string;
}

export function createChallengeHash(token: string, apiKey: string): string {
	return createHash('md5').update(`${token}${apiKey}`).digest('hex');
}

export function normalizeBaseUrl(baseUrl: string, allowInsecureHttp = false): string {
	let parsed: URL;
	try {
		parsed = new URL(baseUrl);
	} catch {
		// Authentication is also used by credential tests, where no node context is available.
		// eslint-disable-next-line @n8n/community-nodes/require-node-api-error
		throw new VtigerApiError('The Vtiger base URL is invalid', 'login');
	}

	if (parsed.username || parsed.password) {
		throw new VtigerApiError('The Vtiger base URL must not contain credentials', 'login');
	}

	if (parsed.protocol !== 'https:' && !(allowInsecureHttp && parsed.protocol === 'http:')) {
		throw new VtigerApiError('The Vtiger base URL must use HTTPS', 'login');
	}

	if (parsed.search || parsed.hash || /\/webservice\.php\/?$/i.test(parsed.pathname)) {
		throw new VtigerApiError(
			'The Vtiger base URL must not include a query, fragment, or /webservice.php',
			'login',
		);
	}

	return parsed.toString().replace(/\/$/, '');
}

export function parseCredentials(data: Record<string, unknown>): VtigerCredentials {
	const baseUrl = data.baseUrl;
	const username = data.username;
	const apiKey = data.apiKey;

	if (typeof baseUrl !== 'string' || typeof username !== 'string' || typeof apiKey !== 'string') {
		throw new VtigerApiError('Vtiger credentials are incomplete', 'login');
	}
	if (!baseUrl.trim() || !username.trim() || !apiKey.trim()) {
		throw new VtigerApiError('Vtiger credentials must not be empty', 'login');
	}

	return {
		baseUrl: normalizeBaseUrl(baseUrl.trim(), data.allowInsecureHttp === true),
		username: username.trim(),
		apiKey: apiKey.trim(),
		allowInsecureHttp: data.allowInsecureHttp === true,
	};
}

export async function authenticate(
	request: VtigerRequest,
	credentials: VtigerCredentials,
): Promise<VtigerSession> {
	const url = `${credentials.baseUrl}/webservice.php`;
	let challengeResponse: unknown;

	try {
		challengeResponse = await request({
			method: 'GET',
			url,
			qs: { operation: 'getchallenge', username: credentials.username },
			json: true,
			timeout: 30000,
		});
	} catch (error) {
		throw requestFailure('getchallenge', error);
	}

	const challenge = unwrapVtigerResponse<ChallengeResult>(challengeResponse, 'getchallenge');
	if (typeof challenge?.token !== 'string' || challenge.token.length === 0) {
		throw new VtigerApiError('Vtiger challenge returned no token', 'getchallenge');
	}

	const body = new URLSearchParams({
		operation: 'login',
		username: credentials.username,
		accessKey: createChallengeHash(challenge.token, credentials.apiKey),
	});

	let loginResponse: unknown;
	try {
		loginResponse = await request({
			method: 'POST',
			url,
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body,
			json: true,
			timeout: 30000,
		});
	} catch (error) {
		throw requestFailure('login', error);
	}

	const session = unwrapVtigerResponse<VtigerSession>(loginResponse, 'login');
	if (typeof session?.sessionName !== 'string' || session.sessionName.length === 0) {
		throw new VtigerApiError('Vtiger login returned no session', 'login');
	}

	return session;
}
