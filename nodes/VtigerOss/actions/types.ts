import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import type { VtigerClient } from '../transport/client';

export interface ActionContext {
	context: IExecuteFunctions;
	client: VtigerClient;
	itemIndex: number;
}

export type ActionHandler = (actionContext: ActionContext) => Promise<unknown>;

const actionOutputMarker = Symbol('vtigerActionOutput');

interface ActionOutput {
	[actionOutputMarker]: true;
	json: IDataObject;
	binary?: INodeExecutionData['binary'];
}

export function createActionOutput(
	json: IDataObject,
	binary?: INodeExecutionData['binary'],
): ActionOutput {
	return { [actionOutputMarker]: true, json, binary };
}

function isActionOutput(value: unknown): value is ActionOutput {
	return typeof value === 'object' && value !== null && actionOutputMarker in value;
}

export function asOutputItems(value: unknown): Array<Pick<INodeExecutionData, 'binary' | 'json'>> {
	const values = Array.isArray(value) ? value : [value];
	return values.map((entry) => {
		if (isActionOutput(entry)) return { json: entry.json, binary: entry.binary };
		if (typeof entry === 'object' && entry !== null && !Array.isArray(entry)) {
			return { json: entry as IDataObject };
		}

		return { json: { result: entry as IDataObject['result'] } };
	});
}
