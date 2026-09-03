import type { ActionHandler } from '../types';
import { validateWebserviceId } from '../../helpers/webserviceId';

export const retrieve: ActionHandler = async ({ context, client, itemIndex }) => {
	const id = validateWebserviceId(context.getNodeParameter('recordId', itemIndex) as string);
	return await client.request({ method: 'GET', operation: 'retrieve', parameters: { id } });
};
