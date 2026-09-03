import type { ActionHandler } from '../types';
import { validateWebserviceId } from '../../helpers/webserviceId';

export const addRelated: ActionHandler = async ({ context, client, itemIndex }) => {
	const sourceRecordId = validateWebserviceId(
		context.getNodeParameter('sourceRecordId', itemIndex) as string,
	);
	const relatedRecordId = validateWebserviceId(
		context.getNodeParameter('relatedRecordId', itemIndex) as string,
	);
	const relationIdLabel = context.getNodeParameter('relationLabel', itemIndex) as string;
	return await client.request({
		method: 'POST',
		operation: 'add_related',
		parameters: { sourceRecordId, relatedRecordId, relationIdLabel },
	});
};
