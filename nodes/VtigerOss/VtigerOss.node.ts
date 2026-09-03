import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { actionProperties } from './actions/properties';
import { routeAction } from './actions/router';
import { asOutputItems } from './actions/types';
import { actionSupportsOutput, formatOutput, parseSelectedFields } from './helpers/output';
import type { OutputMode } from './helpers/output';
import { VtigerClient } from './transport/client';
import { testVtigerCredentials } from './transport/credentialTest';

export class VtigerOss implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Vtiger Open Source',
		name: 'vtigerOss',
		icon: { light: 'file:vtigerOss.svg', dark: 'file:vtigerOss.dark.svg' },
		group: ['transform'],
		version: 1,
		description: 'Interact with Vtiger CRM Open Source',
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		defaults: {
			name: 'Vtiger Open Source',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'vtigerOssApi',
				required: true,
				testedBy: 'testVtigerCredentials',
			},
		],
		properties: actionProperties,
	};

	methods = {
		credentialTest: {
			testVtigerCredentials,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const inputItems = this.getInputData();
		if (inputItems.length === 0) return [[]];

		const client = await VtigerClient.create(this);
		const outputItems: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < inputItems.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as string;
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				const result = await routeAction({ context: this, client, itemIndex });
				const outputMode = actionSupportsOutput(resource, operation)
					? (this.getNodeParameter('output', itemIndex, 'simplified') as OutputMode)
					: 'raw';
				const selectedFields =
					outputMode === 'selected'
						? parseSelectedFields(this.getNodeParameter('fieldsToInclude', itemIndex, ''))
						: [];
				for (const output of asOutputItems(result)) {
					outputItems.push({
						...output,
						json: formatOutput(output.json, outputMode, selectedFields),
						pairedItem: itemIndex,
					});
				}
			} catch (error) {
				const nodeError = new NodeOperationError(
					this.getNode(),
					error instanceof Error ? error : new Error('Unknown Vtiger error'),
					{ itemIndex },
				);

				if (!this.continueOnFail()) throw nodeError;
				outputItems.push({
					json: inputItems[itemIndex].json,
					error: nodeError,
					pairedItem: itemIndex,
				});
			}
		}

		return [outputItems];
	}
}
