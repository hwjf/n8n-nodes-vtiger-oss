# Contributing

Contributions are welcome through GitHub issues and pull requests.

## Development Setup

1. Install Node.js 22.22 or Node.js 24 and npm.
2. Run `npm ci`.
3. Create a branch from `main`.
4. Keep changes focused and add tests for behavior changes.
5. Run `npm run format:check`, `npm run lint`, `npm test`, and `npm run build`.

## Pull Requests

- Do not include credentials, access keys, session names, or customer data.
- Describe user-visible behavior and compatibility implications.
- Mark operations that mutate or delete vtiger data clearly.
- Use test fixtures instead of data exported from production systems.

Integration tests require a dedicated vtiger 8.x test instance. Compatibility claims must state
the exact tested version and installation history. Tests must not run against production systems.
