/* eslint-disable @n8n/community-nodes/no-restricted-globals, @n8n/community-nodes/no-restricted-imports */
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import {
	buildLeadConversion,
	validateLeadConversionResult,
} from '../../nodes/VtigerOss/helpers/lead';
import { encodeElement } from '../../nodes/VtigerOss/helpers/serialization';
import { VtigerClient } from '../../nodes/VtigerOss/transport/client';
import { integrationHttpRequest } from './httpRequest';

function requiredEnvironment(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`Required integration test variable ${name} is missing`);
	return value;
}

async function createClient(): Promise<VtigerClient> {
	return await VtigerClient.create({
		getCredentials: async () => ({
			baseUrl: requiredEnvironment('VTIGER_BASE_URL'),
			username: requiredEnvironment('VTIGER_USERNAME'),
			apiKey: requiredEnvironment('VTIGER_ACCESS_KEY'),
			allowInsecureHttp: process.env.VTIGER_ALLOW_INSECURE_HTTP === 'true',
		}),
		helpers: { httpRequest: integrationHttpRequest },
	} as unknown as IExecuteFunctions);
}

async function requiredCustomFields(
	client: VtigerClient,
	module: string,
	reserved: Set<string>,
	marker: string,
): Promise<IDataObject> {
	const description = await client.request<{ fields: Array<Record<string, unknown>> }>({
		method: 'GET',
		operation: 'describe',
		parameters: { elementType: module },
	});
	const result: IDataObject = {};
	for (const field of description.fields.filter((candidate) => candidate.mandatory === true)) {
		const name = String(field.name);
		if (reserved.has(name)) continue;
		const type = field.type as Record<string, unknown>;
		const picklist = type.picklistValues as Array<{ value?: string }> | undefined;
		if (picklist?.[0]?.value) result[name] = picklist[0].value;
		else if (type.name === 'integer') result[name] = String(field.default || '1');
		else if (type.name === 'boolean') result[name] = false;
		else result[name] = marker;
	}
	return result;
}

async function cleanupLeadFixtures(client: VtigerClient, marker: string): Promise<void> {
	const errors: unknown[] = [];
	for (const [module, field] of [
		['Contacts', 'lastname'],
		['Accounts', 'accountname'],
		['Leads', 'lastname'],
	] as const) {
		try {
			const records = await client.request<Array<{ id?: string }>>({
				method: 'GET',
				operation: 'query',
				parameters: { query: `SELECT id FROM ${module} WHERE ${field} = '${marker}' ORDER BY id;` },
			});
			for (const record of records) {
				if (!record.id) continue;
				try {
					await client.request({
						method: 'POST',
						operation: 'delete',
						parameters: { id: record.id },
					});
				} catch (error) {
					errors.push(error);
				}
			}
		} catch (error) {
			errors.push(error);
		}
	}
	if (errors.length > 0)
		throw new AggregateError(errors, 'Lead integration fixtures could not be cleaned up');
}

test(
	'converts and cleans up a Lead fixture',
	{ skip: process.env.VTIGER_RUN_LEAD_TESTS !== 'true' },
	async () => {
		const client = await createClient();
		const assignedTo = client.getSessionMetadata().userId as string;
		const marker = `n8n-lead-${randomUUID()}`;

		try {
			const lead = await client.request<{ id: string }>({
				method: 'POST',
				operation: 'create',
				parameters: {
					elementType: 'Leads',
					element: encodeElement({ lastname: marker, assigned_user_id: assignedTo }),
				},
			});
			const leadId = lead.id;
			const accountFields = await requiredCustomFields(
				client,
				'Accounts',
				new Set(['accountname', 'assigned_user_id']),
				marker,
			);
			const contactFields = await requiredCustomFields(
				client,
				'Contacts',
				new Set(['lastname', 'assigned_user_id']),
				marker,
			);
			const element = buildLeadConversion({
				leadId,
				assignedTo,
				createAccount: true,
				accountName: marker,
				accountFields,
				createContact: true,
				contactLastName: marker,
				contactFields,
				createPotential: false,
				potentialName: '',
				potentialFields: {},
				transferRelatedRecordsTo: 'Contacts',
			});
			validateLeadConversionResult(
				await client.request({
					method: 'POST',
					operation: 'convertlead',
					parameters: { element: encodeElement(element) },
				}),
				['Accounts', 'Contacts'],
			);
		} finally {
			await cleanupLeadFixtures(client, marker);
		}
	},
);
