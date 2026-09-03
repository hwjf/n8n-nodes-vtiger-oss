import type { Icon, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class VtigerOssApi implements ICredentialType {
	name = 'vtigerOssApi';

	displayName = 'Vtiger Open Source API';

	icon: Icon = {
		light: 'file:../nodes/VtigerOss/vtigerOss.svg',
		dark: 'file:../nodes/VtigerOss/vtigerOss.dark.svg',
	};

	documentationUrl = 'https://github.com/hwjf/n8n-nodes-vtiger-oss#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			placeholder: 'e.g. https://vtiger.example.com/vtigercrm',
			description:
				'Root URL of the Vtiger installation, including any installation subdirectory and excluding /webservice.php',
			required: true,
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Access Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Access key from the Vtiger user preferences, not the account password',
			required: true,
		},
		{
			displayName: 'Allow Insecure HTTP',
			name: 'allowInsecureHttp',
			type: 'boolean',
			default: false,
			description:
				'Whether to allow unencrypted HTTP connections. Enable only for isolated development systems.',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/webservice.php',
			method: 'GET',
			qs: {
				operation: 'getchallenge',
				username: '={{$credentials.username}}',
			},
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					message: 'Vtiger rejected the username or base URL',
					key: 'success',
					value: true,
				},
			},
		],
	};
}
