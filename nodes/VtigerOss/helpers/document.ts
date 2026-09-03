import type { IDataObject } from 'n8n-workflow';
import { VtigerApiError } from '../transport/errors';
import type { VtigerClient } from '../transport/client';
import { parseJsonObject } from './serialization';
import { validateWebserviceId } from './webserviceId';

const PROTECTED_DOCUMENT_FIELDS = new Set([
	'id',
	'notes_title',
	'assigned_user_id',
	'filelocationtype',
	'filestatus',
	'folderid',
	'filename',
]);

export interface DocumentElementOptions {
	title: string;
	fileName: string;
	assignedToId: string;
	folderId: string;
	fileStatus: boolean;
	additionalFields: unknown;
}

export interface UploadedDocument extends IDataObject {
	documentId: string;
	attachmentDownloadIds: string[];
	document: IDataObject;
}

export function validateUploadFileName(value: unknown): string {
	const fileName = String(value ?? '').trim();
	if (!fileName || /[\0\r\n/\\]/.test(fileName)) {
		throw new VtigerApiError('Binary data must have a valid file name without a path', 'create');
	}
	return fileName;
}

export function assertUploadSize(fileSize: number, maximumBytes: number): void {
	if (fileSize === 0) {
		throw new VtigerApiError('Binary file must not be empty', 'create');
	}
	if (fileSize > maximumBytes) {
		throw new VtigerApiError('Binary file exceeds the configured maximum upload size', 'create');
	}
}

export function buildDocumentElement(options: DocumentElementOptions): IDataObject {
	const additionalFields = parseJsonObject(options.additionalFields, 'Additional Fields');
	for (const fieldName of Object.keys(additionalFields)) {
		if (PROTECTED_DOCUMENT_FIELDS.has(fieldName.toLowerCase())) {
			throw new VtigerApiError(
				`Additional Fields must not override protected Document field "${fieldName}"`,
				'create',
			);
		}
	}

	const title = options.title.trim() || options.fileName;
	return {
		...additionalFields,
		notes_title: title,
		assigned_user_id: validateWebserviceId(options.assignedToId),
		filelocationtype: 'I',
		filestatus: options.fileStatus ? 1 : 0,
		folderid: validateWebserviceId(options.folderId),
	};
}

export function normalizeUploadedDocument(result: unknown): UploadedDocument {
	if (typeof result !== 'object' || result === null || Array.isArray(result)) {
		throw new VtigerApiError('Vtiger returned an invalid Document result', 'create');
	}
	const document = result as IDataObject;
	const documentId = validateWebserviceId(String(document.id ?? ''));
	const attachmentDownloadIds = String(document.imageattachmentids ?? '')
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean)
		.map(validateWebserviceId);

	return { documentId, attachmentDownloadIds, document };
}

export function validateRelatedListLabel(value: unknown): string {
	const label = String(value ?? '').trim();
	if (!label) throw new VtigerApiError('Related List Label is required', 'add_related');
	return label;
}

export async function linkUploadedDocument(
	client: VtigerClient,
	documentId: string,
	sourceRecordId: string,
	relatedListLabel: string,
): Promise<unknown> {
	try {
		return await client.request({
			method: 'POST',
			operation: 'add_related',
			parameters: {
				sourceRecordId,
				relatedRecordId: documentId,
				relationIdLabel: relatedListLabel,
			},
		});
	} catch (error) {
		const apiError = error instanceof VtigerApiError ? error : undefined;
		const detail = apiError ? `: ${apiError.message}` : '';
		// This helper has no n8n execution context; the caller wraps the domain error.
		// eslint-disable-next-line @n8n/community-nodes/require-node-api-error
		throw new VtigerApiError(
			`Document ${documentId} was uploaded, but linking it to record ${sourceRecordId} failed${detail}`,
			'add_related',
			apiError?.code,
			apiError?.statusCode,
		);
	}
}
