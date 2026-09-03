# Security Policy

## Reporting a Vulnerability

Do not disclose vulnerabilities or credentials in a public issue. Report security issues
privately through GitHub's **Security** tab and include reproduction steps without real
access keys, session names, or customer data.

## Supported Versions

Until the first stable release, security fixes are provided for the latest published `0.x` version
and the latest commit on `main`.

## Integration Guidance

- Use HTTPS and a dedicated vtiger API user with the minimum required permissions.
- Keep the vtiger access key only in n8n's encrypted credential store.
- When using the node as an AI tool, grant the credential user only the mutation permissions the
  agent actually requires.
- Do not expose n8n execution data containing sensitive CRM records.
