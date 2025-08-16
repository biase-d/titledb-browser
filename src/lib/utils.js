/**
 * Recursively clones and prunes an object, removing keys that have empty values
 * An empty value is considered to be: null, undefined, "", [], or {}
 * @param {any} value The value to prune
 * @returns {any} The pruned value, or undefined if the value itself is empty
 */
export function pruneEmptyValues(value) {
	if (typeof value !== 'object' || value === null) {
		return value === '' || value === null ? undefined : value;
	}

	if (Array.isArray(value)) {
		const prunedArray = value
			.map(item => pruneEmptyValues(item))
			.filter(item => item !== undefined);
		return prunedArray.length > 0 ? prunedArray : undefined;
	}

	const prunedObj = {};
	let keyCount = 0;
	for (const key of Object.keys(value)) {
		const prunedValue = pruneEmptyValues(value[key]);
		if (prunedValue !== undefined) {
			prunedObj[key] = prunedValue;
			keyCount++;
		}
	}

	return keyCount > 0 ? prunedObj : undefined;
}