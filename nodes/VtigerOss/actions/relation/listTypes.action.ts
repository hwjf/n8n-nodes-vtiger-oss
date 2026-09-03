import type { ActionHandler } from '../types';

export const listRelationTypes: ActionHandler = async ({ context, client, itemIndex }) => {
	const elementType = context.getNodeParameter('relationElementType', itemIndex) as string;
	return await client.request({
		method: 'GET',
		operation: 'relatedtypes',
		parameters: { elementType },
	});
};
