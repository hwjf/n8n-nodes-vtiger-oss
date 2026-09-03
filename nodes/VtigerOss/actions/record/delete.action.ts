import type { ActionHandler } from '../types';
import { validateWebserviceId } from '../../helpers/webserviceId';

export const deleteRecord: ActionHandler = async ({ context, client, itemIndex }) => {
	const id = validateWebserviceId(context.getNodeParameter('recordId', itemIndex) as string);
	return await client.request({ method: 'POST', operation: 'delete', parameters: { id } });
};
