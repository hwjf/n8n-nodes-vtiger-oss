import { VtigerApiError } from '../transport/errors';

const WEBSERVICE_ID_PATTERN = /^[1-9]\d*x[1-9]\d*$/;

export function validateWebserviceId(value: string): string {
	if (!WEBSERVICE_ID_PATTERN.test(value)) {
		throw new VtigerApiError(
			'Value must be a Vtiger webservice ID such as 123x456, including its installation-specific entity-type prefix',
			'validation',
		);
	}

	return value;
}
