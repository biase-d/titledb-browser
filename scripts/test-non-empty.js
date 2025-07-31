function hasNonEmptyValue(obj) {
	if (obj == null) return false;
	if (typeof obj === 'string') return obj.trim() !== '';
	if (typeof obj === 'number') return true;
	if (typeof obj === 'boolean') return obj;
	if (Array.isArray(obj)) return obj.some(item => hasNonEmptyValue(item));
	if (typeof obj === 'object') return Object.values(obj).some(value => hasNonEmptyValue(value));
	return false;
}

const graphicsDataEmpty = {
  docked: { resolution: {}, framerate: {}, custom: {} },
  handheld: { resolution: {}, framerate: {}, custom: {} },
  shared: {}
};

console.log(hasNonEmptyValue(graphicsDataEmpty));