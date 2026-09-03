import { linkUploadedDocument, validateRelatedListLabel } from '../../helpers/document';
import { validateWebserviceId } from '../../helpers/webserviceId';
import type { ActionHandler } from '../types';
import { uploadDocument } from './upload.action';

export const uploadAndLink: ActionHandler = async (actionContext) => {
	const { context, client, itemIndex } = actionContext;
	const sourceRecordId = validateWebserviceId(
		context.getNodeParameter('sourceRecordId', itemIndex) as string,
	);
	const relatedListLabel = validateRelatedListLabel(
		context.getNodeParameter('relationLabel', itemIndex),
	);

	const uploaded = await uploadDocument(actionContext);
	const relation = await linkUploadedDocument(
		client,
		uploaded.documentId,
		sourceRecordId,
		relatedListLabel,
	);
	return { ...uploaded, sourceRecordId, relatedListLabel, relation };
};
