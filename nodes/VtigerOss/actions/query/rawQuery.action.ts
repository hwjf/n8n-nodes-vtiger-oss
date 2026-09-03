import type { ActionHandler } from '../types';
import { queryWithPagination } from '../../helpers/pagination';

export const rawQuery: ActionHandler = async ({ context, client, itemIndex }) => {
	const query = context.getNodeParameter('query', itemIndex) as string;
	const returnAll = context.getNodeParameter('returnAll', itemIndex) as boolean;
	const limit = returnAll ? 1 : (context.getNodeParameter('limit', itemIndex) as number);
	const pageSize = context.getNodeParameter('pageSize', itemIndex) as number;

	return await queryWithPagination(client, query, { returnAll, limit, pageSize });
};
