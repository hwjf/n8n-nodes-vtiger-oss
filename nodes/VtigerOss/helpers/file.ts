import { VtigerApiError } from '../transport/errors';

export interface RetrievedFile {
	fileId: string;
	fileName: string;
	mimeType: string;
	fileSize: number;
	data: Buffer;
}

export const MAXIMUM_DOWNLOAD_MEGABYTES = 100;

export function maximumFileSizeInBytes(
	value: unknown,
	fieldName = 'Maximum Download Size',
	operation = 'files_retrieve',
): number {
	if (
		typeof value !== 'number' ||
		!Number.isFinite(value) ||
		value < 1 ||
		value > MAXIMUM_DOWNLOAD_MEGABYTES
	) {
		throw new VtigerApiError(
			`${fieldName} must be between 1 and ${MAXIMUM_DOWNLOAD_MEGABYTES} MB`,
			operation,
		);
	}
	const bytes = Math.floor(value * 1024 * 1024);
	if (!Number.isSafeInteger(bytes)) {
		throw new VtigerApiError(`${fieldName} is invalid`, operation);
	}
	return bytes;
}

function assertValidBase64(value: string): void {
	if (value.length === 0 || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
		throw new VtigerApiError('Vtiger returned invalid base64 file content', 'files_retrieve');
	}
}

function decodeBase64(value: string): Buffer {
	assertValidBase64(value);
	return Buffer.from(value, 'base64');
}

export function parseRetrievedFiles(result: unknown, maximumBytes: number): RetrievedFile[] {
	if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
		throw new VtigerApiError('Maximum download size is invalid', 'files_retrieve');
	}
	const maximumMegabytes = maximumBytes / (1024 * 1024);
	if (!Array.isArray(result) || result.length === 0) {
		throw new VtigerApiError('Vtiger returned no files', 'files_retrieve');
	}

	let totalFileSize = 0;
	const validatedFiles = result.map((entry) => {
		if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
			throw new VtigerApiError('Vtiger returned an invalid file result', 'files_retrieve');
		}
		const file = entry as Record<string, unknown>;
		const fileId = String(file.fileid ?? '');
		const fileName = String(file.filename ?? '');
		const mimeType = String(file.filetype || 'application/octet-stream');
		const fileSize = Number(file.filesize);
		const contents = file.filecontents;
		if (!fileId || !fileName || !Number.isSafeInteger(fileSize) || fileSize < 0) {
			throw new VtigerApiError('Vtiger returned incomplete file metadata', 'files_retrieve');
		}
		if (fileSize > maximumBytes - totalFileSize) {
			throw new VtigerApiError(
				`Files exceed the configured maximum download size of ${maximumMegabytes} MB`,
				'files_retrieve',
			);
		}
		totalFileSize += fileSize;
		if (typeof contents !== 'string') {
			throw new VtigerApiError('Vtiger returned no file content', 'files_retrieve');
		}
		assertValidBase64(contents);
		if (contents.length !== Math.ceil(fileSize / 3) * 4) {
			throw new VtigerApiError('Vtiger file size does not match encoded content', 'files_retrieve');
		}

		return { fileId, fileName, mimeType, fileSize, contents };
	});

	return validatedFiles.map(({ contents, ...file }) => {
		const data = decodeBase64(contents);
		if (data.length !== file.fileSize) {
			throw new VtigerApiError('Vtiger file size does not match decoded content', 'files_retrieve');
		}

		return { ...file, data };
	});
}
