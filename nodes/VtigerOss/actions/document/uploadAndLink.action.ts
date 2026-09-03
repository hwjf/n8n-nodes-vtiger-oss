import { NodeOperationError } from 'n8n-workflow';
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
	let relation: unknown;
	try {
		relation = await linkUploadedDocument(
			client,
			uploaded.documentId,
			sourceRecordId,
			relatedListLabel,
		);
	} catch (error) {
		const detail = error instanceof Error ? `: ${error.message}` : '';
		throw new NodeOperationError(
			context.getNode(),
			`Document ${uploaded.documentId} was uploaded, but linking it to record ${sourceRecordId} failed${detail}`,
		);
	}
	return { ...uploaded, sourceRecordId, relatedListLabel, relation };
};
