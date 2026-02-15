import { Game } from '$lib/models/Game.js'

/**
 * Teaches SvelteKit how to serialize/deserialize our Game class
 * @type {import('@sveltejs/kit').Transport}
 */
export const transport = {
	Game: {
		encode: (value) => {
			return value instanceof Game ? [{ ...value }] : undefined
		},
		decode: ([data]) => {
			return new Game(data)
		}
	}
}
