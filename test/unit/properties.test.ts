/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { actionProperties } from '../../nodes/VtigerOss/actions/properties';

function operationValues(resource: string): unknown[] {
	const property = actionProperties.find(
		(candidate) =>
			candidate.name === 'operation' &&
			candidate.displayOptions?.show?.resource?.includes(resource),
	);
	assert.ok(property?.options);
	return property.options.map((option) => ('value' in option ? option.value : undefined));
}

// Ignore non-action conditions here; focused tests cover conditional behavior separately.
function actionConditionMatches(
	condition: Record<string, unknown> | undefined,
	values: Record<string, unknown>,
): boolean {
	if (!condition) return true;
	return Object.entries(condition).every(([name, expected]) => {
		if (!(name in values)) return true;
		return Array.isArray(expected) && expected.includes(values[name]);
	});
}

function hasProperty(resource: string, operation: string, name: string): boolean {
	const values = { resource, operation };
	return actionProperties.some((property) => {
		if (property.name !== name) return false;
		const show = property.displayOptions?.show as Record<string, unknown> | undefined;
		const hide = property.displayOptions?.hide as Record<string, unknown> | undefined;
		return actionConditionMatches(show, values) && !(hide && actionConditionMatches(hide, values));
	});
}

function nestedObjects(value: unknown): Array<Record<string, unknown>> {
	if (Array.isArray(value)) return value.flatMap(nestedObjects);
	if (typeof value !== 'object' || value === null) return [];

	const object = value as Record<string, unknown>;
	return [object, ...Object.values(object).flatMap(nestedObjects)];
}

const handlerParameters: Record<string, string[]> = {
	'advanced.customGet': ['customOperation', 'customParameters'],
	'advanced.customPost': ['customOperation', 'customParameters'],
	'document.download': ['attachmentId', 'binaryPropertyName', 'maximumFileSize'],
	'document.upload': [
		'assignedToId',
		'binaryPropertyName',
		'documentFields',
		'documentTitle',
		'fileStatus',
		'folderId',
		'maximumFileSize',
	],
	'document.uploadAndLink': [
		'assignedToId',
		'binaryPropertyName',
		'documentFields',
		'documentTitle',
		'fileStatus',
		'folderId',
		'maximumFileSize',
		'relationLabel',
		'sourceRecordId',
	],
	'lead.convert': [
		'createAccount',
		'createContact',
		'createPotential',
		'leadId',
		'assignedTo',
		'accountName',
		'accountFields',
		'contactLastName',
		'contactFields',
		'potentialName',
		'potentialFields',
		'transferRelatedRecordsTo',
	],
	'metadata.describe': ['elementType'],
	'metadata.listTypes': [],
	'query.getMany': ['elementType', 'condition', 'orderBy', 'returnAll', 'limit', 'pageSize'],
	'query.rawQuery': ['query', 'returnAll', 'limit', 'pageSize'],
	'record.create': ['elementType', 'fields'],
	'record.delete': ['recordId'],
	'record.retrieve': ['recordId'],
	'record.revise': ['recordId', 'fields'],
	'record.update': ['recordId', 'fields'],
	'relation.addRelated': ['sourceRecordId', 'relatedRecordId', 'relationLabel'],
	'relation.listTypes': ['relationElementType'],
	'relation.queryRelated': ['recordId', 'relatedQuery', 'relationLabel'],
	'relation.retrieveRelated': ['recordId', 'relatedType', 'relationLabel'],
};

test('exposes partial and full updates under the record resource', () => {
	assert.deepEqual(operationValues('record'), ['create', 'delete', 'update', 'retrieve', 'revise']);
});

test('exposes the registered relation operations', () => {
	assert.deepEqual(operationValues('relation'), [
		'addRelated',
		'retrieveRelated',
		'listTypes',
		'queryRelated',
	]);
});

test('exposes the source record ID for relation retrieval and search', () => {
	const property = actionProperties.find((candidate) => candidate.name === 'recordId');
	assert.deepEqual(property?.displayOptions?.show, {
		resource: ['record', 'relation'],
		operation: ['delete', 'queryRelated', 'retrieve', 'retrieveRelated', 'revise', 'update'],
	});
});

test('defines every parameter read by each action handler', () => {
	for (const [action, parameters] of Object.entries(handlerParameters)) {
		const [resource, operation] = action.split('.');
		for (const parameter of parameters) {
			assert.equal(
				hasProperty(resource, operation, parameter),
				true,
				`${action} is missing editor property ${parameter}`,
			);
		}
	}
});

test('hides module name when listing accessible metadata modules', () => {
	assert.equal(hasProperty('metadata', 'listTypes', 'elementType'), false);
	assert.equal(hasProperty('relation', 'listTypes', 'relationElementType'), true);
});

test('exposes module name for metadata description without a conflicting hide condition', () => {
	const property = actionProperties.find(
		(candidate) =>
			candidate.name === 'elementType' &&
			candidate.displayOptions?.show?.resource?.includes('metadata'),
	);

	assert.deepEqual(property?.displayOptions, {
		show: {
			resource: ['metadata', 'query', 'record'],
			operation: ['describe', 'getMany', 'create'],
		},
	});
});

test('labels module type parameters as names rather than numeric IDs', () => {
	const moduleTypes = actionProperties.filter((candidate) =>
		['elementType', 'relationElementType'].includes(candidate.name),
	);
	const relatedType = actionProperties.find((candidate) => candidate.name === 'relatedType');

	assert.equal(actionProperties.filter((candidate) => candidate.name === 'elementType').length, 1);
	assert.equal(
		actionProperties.filter((candidate) => candidate.name === 'relationElementType').length,
		1,
	);
	assert.equal(
		moduleTypes.every((property) => property.displayName === 'Module Name'),
		true,
	);
	assert.equal(relatedType?.displayName, 'Related Module Name');
});

test('uses consistent examples and installation-specific webservice ID guidance', () => {
	const objects = nestedObjects(actionProperties);
	const idFieldNames = new Set([
		'assignedTo',
		'assignedToId',
		'attachmentId',
		'folderId',
		'leadId',
		'recordId',
		'relatedRecordId',
		'sourceRecordId',
	]);
	const idFields = objects.filter(
		(object) => typeof object.name === 'string' && idFieldNames.has(object.name),
	);

	assert.equal(idFields.length, idFieldNames.size);
	for (const field of idFields) {
		assert.equal(field.placeholder, 'e.g. 123x456', `${String(field.name)} has an inconsistent ID`);
		assert.match(String(field.description), /installation-specific entity-type prefix/);
	}
	for (const object of objects) {
		if (typeof object.placeholder === 'string') {
			assert.match(object.placeholder, /^e\.g\. /);
		}
	}
});

test('explains how to obtain installation-specific webservice IDs', () => {
	const notice = actionProperties.find((property) => property.name === 'webserviceIdNotice');
	assert.match(String(notice?.displayName), /query the relevant module/);
	assert.match(String(notice?.displayName), /CRM URLs contain only the record-number part/);
	assert.doesNotMatch(String(notice?.displayName), /[<>]/);
	assert.deepEqual(notice?.displayOptions?.show?.resource, [
		'document',
		'lead',
		'record',
		'relation',
	]);

	const folderId = actionProperties.find((property) => property.name === 'folderId');
	assert.match(String(folderId?.description), /reuse its folderid/);
});

test('distinguishes guided and raw VTQL queries', () => {
	const operations = actionProperties.find(
		(property) =>
			property.name === 'operation' && property.displayOptions?.show?.resource?.includes('query'),
	)?.options;
	assert.ok(operations);
	const names = Object.fromEntries(
		operations.map((option) => [String('value' in option ? option.value : ''), option.name]),
	);
	const actions = Object.fromEntries(
		operations.map((option) => [String('value' in option ? option.value : ''), option.action]),
	);
	assert.equal(names.getMany, 'Guided VTQL Query');
	assert.equal(names.rawQuery, 'Raw VTQL Query');
	assert.equal(actions.getMany, 'Run a guided VTQL query');
	assert.equal(actions.rawQuery, 'Run a raw VTQL query');

	const rawQuery = actionProperties.find((property) => property.name === 'query');
	const relatedQuery = actionProperties.find((property) => property.name === 'relatedQuery');
	assert.equal(rawQuery?.default, '');
	assert.equal(relatedQuery?.default, '');
});

test('exposes Document upload, linking, and attachment download', () => {
	assert.deepEqual(operationValues('document'), ['download', 'upload', 'uploadAndLink']);
	const operations = actionProperties.find(
		(property) =>
			property.name === 'operation' &&
			property.displayOptions?.show?.resource?.includes('document'),
	)?.options;
	assert.ok(operations);
	const actions = Object.fromEntries(
		operations.map((option) => [String('value' in option ? option.value : ''), option.action]),
	);
	assert.equal(actions.upload, 'Upload a binary file as a document');
	assert.equal(actions.uploadAndLink, 'Upload a binary file as a document and link it to a record');
});

test('exposes modern lead conversion', () => {
	assert.deepEqual(operationValues('lead'), ['convert']);
});

test('separates custom GET and POST operations', () => {
	assert.deepEqual(operationValues('advanced'), ['customGet', 'customPost']);
});

test('uses Vtiger terminology for visible resources and related-record operations', () => {
	const resources = actionProperties.find((property) => property.name === 'resource')?.options;
	assert.ok(resources);
	const resourceNames = Object.fromEntries(
		resources.map((option) => [String('value' in option ? option.value : ''), option.name]),
	);
	assert.deepEqual(Object.keys(resourceNames), [
		'advanced',
		'document',
		'lead',
		'metadata',
		'query',
		'record',
		'relation',
	]);
	assert.equal(resourceNames.document, 'Document');
	assert.equal(resourceNames.metadata, 'Module');
	assert.equal(resourceNames.relation, 'Related Record');

	const relationOperations = actionProperties.find(
		(property) =>
			property.name === 'operation' &&
			property.displayOptions?.show?.resource?.includes('relation'),
	)?.options;
	assert.ok(relationOperations);
	const operationNames = Object.fromEntries(
		relationOperations.map((option) => [
			String('value' in option ? option.value : ''),
			option.name,
		]),
	);
	assert.equal(operationNames.retrieveRelated, 'Retrieve Related Records');
	assert.equal(operationNames.listTypes, 'List Related Types');
	assert.equal(operationNames.queryRelated, 'Query Related Records');
});

test('exposes all operations to AI tools', () => {
	assert.equal(JSON.stringify(actionProperties).includes('@tool'), false);

	const resources = actionProperties.find((property) => property.name === 'resource')?.options;
	const advanced = resources?.find((option) => 'value' in option && option.value === 'advanced');
	const query = resources?.find((option) => 'value' in option && option.value === 'query');
	assert.equal(advanced?.displayOptions, undefined);
	assert.equal(query?.displayOptions, undefined);

	const queryOperations = actionProperties.find(
		(property) =>
			property.name === 'operation' && property.displayOptions?.show?.resource?.includes('query'),
	)?.options;
	const rawQuery = queryOperations?.find(
		(option) => 'value' in option && option.value === 'rawQuery',
	);
	assert.equal(rawQuery?.displayOptions, undefined);

	const relationOperations = actionProperties.find(
		(property) =>
			property.name === 'operation' &&
			property.displayOptions?.show?.resource?.includes('relation'),
	)?.options;
	const queryRelated = relationOperations?.find(
		(option) => 'value' in option && option.value === 'queryRelated',
	);
	assert.equal(queryRelated?.displayOptions, undefined);
});
