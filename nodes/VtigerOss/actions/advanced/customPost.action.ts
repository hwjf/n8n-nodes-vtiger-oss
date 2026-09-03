import type { ActionHandler } from '../types';
import { serializeCustomParameters, validateCustomOperation } from '../../helpers/advanced';

export const customPost: ActionHandler = async ({ context, client, itemIndex }) => {
	const operation = validateCustomOperation(
		context.getNodeParameter('customOperation', itemIndex) as string,
	);
	const parameters = serializeCustomParameters(
		context.getNodeParameter('customParameters', itemIndex),
	);
	return await client.request({ method: 'POST', operation, parameters });
};
