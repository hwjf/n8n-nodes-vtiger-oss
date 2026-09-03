import { VtigerApiError } from '../transport/errors';
import { customGet } from './advanced/customGet.action';
import { customPost } from './advanced/customPost.action';
import { downloadAttachment } from './document/download.action';
import { upload } from './document/upload.action';
import { uploadAndLink } from './document/uploadAndLink.action';
import { convertLead } from './lead/convert.action';
import { describe } from './metadata/describe.action';
import { listTypes } from './metadata/listTypes.action';
import { getMany } from './query/getMany.action';
import { rawQuery } from './query/rawQuery.action';
import { create } from './record/create.action';
import { deleteRecord } from './record/delete.action';
import { retrieve } from './record/retrieve.action';
import { revise } from './record/revise.action';
import { update } from './record/update.action';
import { addRelated } from './relation/addRelated.action';
import { listRelationTypes } from './relation/listTypes.action';
import { queryRelated } from './relation/queryRelated.action';
import { retrieveRelated } from './relation/retrieveRelated.action';
import type { ActionContext, ActionHandler } from './types';

const handlers: Record<string, ActionHandler> = {
	'advanced.customGet': customGet,
	'advanced.customPost': customPost,
	'document.download': downloadAttachment,
	'document.upload': upload,
	'document.uploadAndLink': uploadAndLink,
	'lead.convert': convertLead,
	'metadata.describe': describe,
	'metadata.listTypes': listTypes,
	'query.getMany': getMany,
	'query.rawQuery': rawQuery,
	'record.create': create,
	'record.delete': deleteRecord,
	'record.retrieve': retrieve,
	'record.revise': revise,
	'record.update': update,
	'relation.addRelated': addRelated,
	'relation.listTypes': listRelationTypes,
	'relation.queryRelated': queryRelated,
	'relation.retrieveRelated': retrieveRelated,
};

export async function routeAction(actionContext: ActionContext): Promise<unknown> {
	const { context, itemIndex } = actionContext;
	const resource = context.getNodeParameter('resource', itemIndex) as string;
	const operation = context.getNodeParameter('operation', itemIndex) as string;
	const handler = handlers[`${resource}.${operation}`];

	if (!handler) {
		throw new VtigerApiError(`Unsupported action: ${resource}.${operation}`, operation);
	}

	return await handler(actionContext);
}
