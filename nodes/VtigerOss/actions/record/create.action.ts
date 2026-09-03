import type { ActionHandler } from '../types';
import { encodeElement, parseJsonObject } from '../../helpers/serialization';

export const create: ActionHandler = async ({ context, client, itemIndex }) => {
	const elementType = context.getNodeParameter('elementType', itemIndex) as string;
	const fields = parseJsonObject(context.getNodeParameter('fields', itemIndex), 'Fields');
	return await client.request({
		method: 'POST',
		operation: 'create',
		parameters: { elementType, element: encodeElement(fields) },
	});
};
