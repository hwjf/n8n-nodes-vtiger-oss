import type { ActionHandler } from '../types';
import { normalizeQuery } from '../../helpers/pagination';
import { validateWebserviceId } from '../../helpers/webserviceId';

export const queryRelated: ActionHandler = async ({ context, client, itemIndex }) => {
	const id = validateWebserviceId(context.getNodeParameter('recordId', itemIndex) as string);
	const query = normalizeQuery(
		context.getNodeParameter('relatedQuery', itemIndex) as string,
		false,
		true,
	);
	const relatedLabel = context.getNodeParameter('relationLabel', itemIndex) as string;
	return await client.request({
		method: 'GET',
		operation: 'query_related',
		parameters: { query, id, relatedLabel },
	});
};
