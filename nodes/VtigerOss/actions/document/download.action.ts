import type { ActionHandler } from '../types';
import { createActionOutput } from '../types';
import { maximumFileSizeInBytes, parseRetrievedFiles } from '../../helpers/file';
import { validateWebserviceId } from '../../helpers/webserviceId';

export const downloadAttachment: ActionHandler = async ({ context, client, itemIndex }) => {
	const id = validateWebserviceId(context.getNodeParameter('attachmentId', itemIndex) as string);
	const binaryPropertyName = context.getNodeParameter('binaryPropertyName', itemIndex) as string;
	const maximumMegabytes = context.getNodeParameter('maximumFileSize', itemIndex) as number;
	const maximumBytes = maximumFileSizeInBytes(maximumMegabytes);
	const result = await client.request({
		method: 'GET',
		operation: 'files_retrieve',
		parameters: { id },
	});
	const files = parseRetrievedFiles(result, maximumBytes);
	const outputs = [];

	for (const file of files) {
		const binaryData = await context.helpers.prepareBinaryData(
			file.data,
			file.fileName,
			file.mimeType,
		);
		outputs.push(
			createActionOutput(
				{
					fileId: file.fileId,
					fileName: file.fileName,
					mimeType: file.mimeType,
					fileSize: file.fileSize,
				},
				{ [binaryPropertyName]: binaryData },
			),
		);
	}

	return outputs;
};
