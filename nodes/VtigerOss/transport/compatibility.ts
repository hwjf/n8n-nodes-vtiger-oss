const VERSION_PATTERN = /^(\d+)\.(\d+)(?:\.(\d+))?/;

export function getCompatibilityHint(
	operation: string,
	version: string | undefined,
): string | undefined {
	if (!version) return undefined;
	const match = VERSION_PATTERN.exec(version);
	if (!match) return undefined;
	const major = Number(match[1]);
	const minor = Number(match[2]);

	if (operation === 'files_retrieve' && major === 8 && minor < 4) {
		return 'Vtiger 8.0 through 8.3 may register parameter id while the PHP handler expects file_id';
	}
	if (operation === 'convertlead' && major === 8) {
		return 'Some Vtiger 8.x installations retain an obsolete operation registration instead of one JSON-encoded element parameter';
	}
	if (operation === 'sync' && major === 8) {
		return 'Stock Vtiger 8.x registrations can omit the handler parameter syncType';
	}
	return undefined;
}
