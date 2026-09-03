import type { ActionHandler } from '../types';
import { encodeElement, parseJsonObject } from '../../helpers/serialization';
import { validateWebserviceId } from '../../helpers/webserviceId';

export const revise: ActionHandler = async ({ context, client, itemIndex }) => {
	const id = validateWebserviceId(context.getNodeParameter('recordId', itemIndex) as string);
	const fields = parseJsonObject(context.getNodeParameter('fields', itemIndex), 'Fields');
	return await client.request({
		method: 'POST',
		operation: 'revise',
		parameters: { element: encodeElement({ ...fields, id }) },
	});
};
