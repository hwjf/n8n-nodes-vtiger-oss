/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	buildLeadConversion,
	validateLeadConversionResult,
} from '../../nodes/VtigerOss/helpers/lead';

test('builds a protected modern lead conversion payload', () => {
	const payload = buildLeadConversion({
		leadId: '10x1',
		assignedTo: '19x1',
		createAccount: true,
		accountName: 'Test Account',
		accountFields: { name: 'Wrong', create: false, accountname: 'Wrong', accounttype: 'Endkunde' },
		createContact: true,
		contactLastName: 'Test Contact',
		contactFields: {},
		createPotential: false,
		potentialName: '',
		potentialFields: {},
		transferRelatedRecordsTo: 'Contacts',
	});
	const entities = payload.entities as Record<string, Record<string, unknown>>;

	assert.equal(payload.leadId, '10x1');
	assert.equal(entities.Accounts.name, 'Accounts');
	assert.equal(entities.Accounts.create, true);
	assert.equal(entities.Accounts.accountname, 'Test Account');
	assert.equal(entities.Accounts.accounttype, 'Endkunde');
	assert.equal(entities.Contacts.lastname, 'Test Contact');
});

test('validates lead conversion choices and returned IDs', () => {
	const base = {
		leadId: '10x1',
		assignedTo: '19x1',
		createAccount: false,
		accountName: '',
		accountFields: {},
		createContact: false,
		contactLastName: '',
		contactFields: {},
		createPotential: false,
		potentialName: '',
		potentialFields: {},
		transferRelatedRecordsTo: 'Contacts',
	};
	assert.throws(() => buildLeadConversion(base), /Account or Contact/);
	assert.throws(
		() =>
			buildLeadConversion({
				...base,
				createAccount: true,
				accountName: 'Test',
				createContact: true,
				contactLastName: 'Test',
				transferRelatedRecordsTo: 'Potentials',
			}),
		/Accounts or Contacts/,
	);
	assert.throws(() => validateLeadConversionResult(null, ['Contacts']), /no Vtiger webservice IDs/);
	assert.throws(
		() => validateLeadConversionResult({ Accounts: '11x1' }, ['Accounts', 'Contacts']),
		/no Vtiger webservice ID for module Contacts/,
	);
	assert.throws(
		() => validateLeadConversionResult({ Contacts: 'not-an-id' }, ['Contacts']),
		/invalid Vtiger webservice ID for module Contacts/,
	);
	assert.deepEqual(validateLeadConversionResult({ Contacts: '12x1' }, ['Contacts']), {
		Contacts: '12x1',
	});
});
