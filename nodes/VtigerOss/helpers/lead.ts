import type { IDataObject } from 'n8n-workflow';
import { VtigerApiError } from '../transport/errors';
import { parseJsonObject } from './serialization';
import { isWebserviceId, validateWebserviceId } from './webserviceId';

export interface LeadConversionOptions {
	leadId: string;
	assignedTo: string;
	createAccount: boolean;
	accountName: string;
	accountFields: unknown;
	createContact: boolean;
	contactLastName: string;
	contactFields: unknown;
	createPotential: boolean;
	potentialName: string;
	potentialFields: unknown;
	transferRelatedRecordsTo: string;
}

export function buildLeadConversion(options: LeadConversionOptions): IDataObject {
	if (!options.createAccount && !options.createContact) {
		throw new VtigerApiError('Lead conversion must create an Account or Contact', 'convertlead');
	}
	if (!['Accounts', 'Contacts'].includes(options.transferRelatedRecordsTo)) {
		throw new VtigerApiError('Transfer target must be Accounts or Contacts', 'convertlead');
	}
	if (
		(options.transferRelatedRecordsTo === 'Accounts' && !options.createAccount) ||
		(options.transferRelatedRecordsTo === 'Contacts' && !options.createContact)
	) {
		throw new VtigerApiError(
			'Transfer target must be one of the entities selected for creation',
			'convertlead',
		);
	}

	const accounts = parseJsonObject(options.accountFields, 'Account Additional Fields');
	const contacts = parseJsonObject(options.contactFields, 'Contact Additional Fields');
	const potentials = parseJsonObject(options.potentialFields, 'Potential Additional Fields');
	if (options.createAccount && !options.accountName.trim()) {
		throw new VtigerApiError('Account Name is required', 'convertlead');
	}
	if (options.createContact && !options.contactLastName.trim()) {
		throw new VtigerApiError('Contact Last Name is required', 'convertlead');
	}
	if (options.createPotential && !options.potentialName.trim()) {
		throw new VtigerApiError('Potential Name is required', 'convertlead');
	}

	return {
		leadId: validateWebserviceId(options.leadId),
		assignedTo: validateWebserviceId(options.assignedTo),
		transferRelatedRecordsTo: options.transferRelatedRecordsTo,
		imageAttachmentId: '',
		entities: {
			Accounts: {
				...accounts,
				create: options.createAccount,
				name: 'Accounts',
				...(options.createAccount ? { accountname: options.accountName } : {}),
			},
			Contacts: {
				...contacts,
				create: options.createContact,
				name: 'Contacts',
				...(options.createContact ? { lastname: options.contactLastName } : {}),
			},
			Potentials: {
				...potentials,
				create: options.createPotential,
				name: 'Potentials',
				...(options.createPotential ? { potentialname: options.potentialName } : {}),
			},
		},
	};
}

export function validateLeadConversionResult(
	result: unknown,
	requestedEntities: string[],
): IDataObject {
	if (typeof result !== 'object' || result === null || Array.isArray(result)) {
		throw new VtigerApiError(
			'Lead conversion returned no Vtiger webservice IDs; verify the JSON-encoded element registration',
			'convertlead',
		);
	}
	const entityIds = result as Record<string, unknown>;
	for (const entity of requestedEntities) {
		const id = entityIds[entity];
		if (typeof id !== 'string') {
			throw new VtigerApiError(
				`Lead conversion returned no Vtiger webservice ID for module ${entity}; the operation may be registered incompatibly`,
				'convertlead',
			);
		}
		if (!isWebserviceId(id)) {
			throw new VtigerApiError(
				`Lead conversion returned an invalid Vtiger webservice ID for module ${entity}`,
				'convertlead',
			);
		}
	}
	return result as IDataObject;
}
