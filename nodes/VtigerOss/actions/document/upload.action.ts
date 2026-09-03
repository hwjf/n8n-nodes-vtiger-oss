import type { ActionContext, ActionHandler } from '../types';
import type { UploadedDocument } from '../../helpers/document';
import {
	assertUploadSize,
	buildDocumentElement,
	normalizeUploadedDocument,
	validateUploadFileName,
} from '../../helpers/document';
import { maximumFileSizeInBytes } from '../../helpers/file';
import { encodeElement } from '../../helpers/serialization';

export async function uploadDocument({
	context,
	client,
	itemIndex,
}: ActionContext): Promise<UploadedDocument> {
	const binaryPropertyName = context.getNodeParameter('binaryPropertyName', itemIndex) as string;
	const binaryData = context.helpers.assertBinaryData(itemIndex, binaryPropertyName);
	const fileName = validateUploadFileName(binaryData.fileName);
	const file = await context.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
	const maximumBytes = maximumFileSizeInBytes(
		context.getNodeParameter('maximumFileSize', itemIndex) as number,
		'Maximum Upload Size',
		'create',
	);
	assertUploadSize(file.length, maximumBytes);
	const element = buildDocumentElement({
		title: context.getNodeParameter('documentTitle', itemIndex, '') as string,
		fileName,
		assignedToId: context.getNodeParameter('assignedToId', itemIndex) as string,
		folderId: context.getNodeParameter('folderId', itemIndex) as string,
		fileStatus: context.getNodeParameter('fileStatus', itemIndex) as boolean,
		additionalFields: context.getNodeParameter('documentFields', itemIndex, '{}'),
	});
	const result = await client.requestMultipart({
		operation: 'create',
		parameters: {
			elementType: 'Documents',
			element: encodeElement(element),
			filename_hidden: fileName,
		},
		file: {
			fieldName: 'filename',
			data: file,
			fileName,
			mimeType: binaryData.mimeType,
		},
	});

	return normalizeUploadedDocument(result);
}

export const upload: ActionHandler = async (actionContext) => await uploadDocument(actionContext);
