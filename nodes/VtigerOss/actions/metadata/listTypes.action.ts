import type { ActionHandler } from '../types';

export const listTypes: ActionHandler = async ({ client }) =>
	await client.request({ method: 'GET', operation: 'listtypes' });
