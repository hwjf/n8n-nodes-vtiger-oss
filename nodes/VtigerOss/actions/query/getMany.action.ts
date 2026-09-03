import type { ActionHandler } from '../types';
import { queryWithPagination } from '../../helpers/pagination';

export const getMany: ActionHandler = async ({ context, client, itemIndex }) => {
	const elementType = context.getNodeParameter('elementType', itemIndex) as string;
	const condition = (context.getNodeParameter('condition', itemIndex, '') as string).trim();
	const orderBy = context.getNodeParameter('orderBy', itemIndex) as string;
	const returnAll = context.getNodeParameter('returnAll', itemIndex) as boolean;
	const limit = returnAll ? 1 : (context.getNodeParameter('limit', itemIndex) as number);
	const pageSize = context.getNodeParameter('pageSize', itemIndex) as number;
	const whereClause = condition ? ` WHERE ${condition}` : '';

	return await queryWithPagination(
		client,
		`SELECT * FROM ${elementType}${whereClause} ORDER BY ${orderBy}`,
		{ returnAll, limit, pageSize },
	);
};
