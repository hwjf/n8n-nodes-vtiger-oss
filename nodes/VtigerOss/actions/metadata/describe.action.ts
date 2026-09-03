import type { ActionHandler } from '../types';

export const describe: ActionHandler = async ({ context, client, itemIndex }) => {
	const elementType = context.getNodeParameter('elementType', itemIndex) as string;
	return await client.request({
		method: 'GET',
		operation: 'describe',
		parameters: { elementType },
	});
};
