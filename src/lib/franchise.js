/**
 * Which Nintendo franchise a game belongs to, for the small easter egg on its
 * page. Matched on the name first (a Mario game from another publisher still
 * counts), then on the publisher: any other Nintendo game gets the generic one
 */

/** @typedef {'block' | 'rupee' | 'bell' | 'star' | 'ball'} EggKind */

/** @type {Array<[RegExp, EggKind]>} */
const BY_NAME = [
	[/\b(mario|luigi|wario|yoshi|toad|donkey kong|bowser)\b/i, 'block'],
	[/\b(zelda|hyrule|link's awakening)\b/i, 'rupee'],
	[/animal crossing/i, 'bell'],
	[/\b(kirby)\b/i, 'star'],
	[/pok[eé]mon/i, 'ball']
]

/**
 * @param {string[] | null | undefined} names
 * @param {string | null | undefined} publisher
 * @returns {EggKind | null} null when it is not a Nintendo game
 */
export function eggFor (names, publisher) {
	for (const name of names ?? []) {
		for (const [pattern, kind] of BY_NAME) if (pattern.test(name)) return kind
	}
	return /nintendo/i.test(publisher ?? '') ? 'block' : null
}
