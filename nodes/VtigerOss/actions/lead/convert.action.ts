import type { ActionHandler } from '../types';
import { buildLeadConversion, validateLeadConversionResult } from '../../helpers/lead';
import { encodeElement } from '../../helpers/serialization';

export const convertLead: ActionHandler = async ({ context, client, itemIndex }) => {
	const createAccount = context.getNodeParameter('createAccount', itemIndex) as boolean;
	const createContact = context.getNodeParameter('createContact', itemIndex) as boolean;
	const createPotential = context.getNodeParameter('createPotential', itemIndex) as boolean;
	const element = buildLeadConversion({
		leadId: context.getNodeParameter('leadId', itemIndex) as string,
		assignedTo: context.getNodeParameter('assignedTo', itemIndex) as string,
		createAccount,
		accountName: context.getNodeParameter('accountName', itemIndex, '') as string,
		accountFields: context.getNodeParameter('accountFields', itemIndex, '{}'),
		createContact,
		contactLastName: context.getNodeParameter('contactLastName', itemIndex, '') as string,
		contactFields: context.getNodeParameter('contactFields', itemIndex, '{}'),
		createPotential,
		potentialName: context.getNodeParameter('potentialName', itemIndex, '') as string,
		potentialFields: context.getNodeParameter('potentialFields', itemIndex, '{}'),
		transferRelatedRecordsTo: context.getNodeParameter(
			'transferRelatedRecordsTo',
			itemIndex,
		) as string,
	});
	const result = await client.request({
		method: 'POST',
		operation: 'convertlead',
		parameters: { element: encodeElement(element) },
	});
	const requestedEntities = [
		...(createAccount ? ['Accounts'] : []),
		...(createContact ? ['Contacts'] : []),
		...(createPotential ? ['Potentials'] : []),
	];
	return validateLeadConversionResult(result, requestedEntities);
};
