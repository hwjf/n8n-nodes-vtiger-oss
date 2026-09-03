import type { ActionHandler } from '../types';
import { validateWebserviceId } from '../../helpers/webserviceId';

export const retrieveRelated: ActionHandler = async ({ context, client, itemIndex }) => {
	const id = validateWebserviceId(context.getNodeParameter('recordId', itemIndex) as string);
	const relatedType = context.getNodeParameter('relatedType', itemIndex) as string;
	const relatedLabel = context.getNodeParameter('relationLabel', itemIndex) as string;
	return await client.request({
		method: 'GET',
		operation: 'retrieve_related',
		parameters: { id, relatedType, relatedLabel },
	});
};
