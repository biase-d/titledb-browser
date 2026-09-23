/**
 * Generates the bundled flag icon set used by src/lib/components/CountryFlag.svelte
 *
 * Without this, @iconify/svelte fetches every flag from api.iconify.design at
 * runtime: a third-party round trip on first render, nothing during SSR, and
 * icons that pop in after hydration. Bundling the codes we know about turns that
 * into one local, cache-busted chunk. Codes outside the list still work - they
 * just fall back to the API, exactly as before
 *
 * Run via `npm run build:flags` (wired into `prepare` and `build`)
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { KNOWN_REGION_CODES } from '../src/lib/regions.js'
import { getFlagIcon } from '../src/lib/flags.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(root, 'src/lib/generated/flag-icons.json')

/** @param {string} prefix */
async function loadSet (prefix) {
	const path = resolve(root, 'node_modules/@iconify-json', prefix, 'icons.json')
	return JSON.parse(await readFile(path, 'utf8'))
}

async function main () {
	// getFlagIcon owns which set each code comes from, so the bundle can never
	// disagree with what the component asks for at runtime
	/** @type {Map<string, string[]>} */
	const wanted = new Map()
	for (const code of KNOWN_REGION_CODES) {
		const [prefix, name] = getFlagIcon(code).split(':')
		if (!wanted.has(prefix)) wanted.set(prefix, [])
		wanted.get(prefix).push(name)
	}

	const collections = []
	const missing = []

	for (const [prefix, names] of wanted) {
		const source = await loadSet(prefix)
		/** @type {Record<string, any>} */
		const icons = {}
		for (const name of names) {
			const icon = source.icons[name] ?? source.aliases?.[name]
			if (!icon) {
				missing.push(`${prefix}:${name}`)
				continue
			}
			icons[name] = icon
		}
		collections.push({
			prefix,
			icons,
			width: source.width,
			height: source.height
		})
	}

	if (missing.length) {
		throw new Error(`Icons not found in their set: ${missing.join(', ')}`)
	}

	const total = collections.reduce((n, c) => n + Object.keys(c.icons).length, 0)
	const json = JSON.stringify({ collections })

	await mkdir(dirname(OUT), { recursive: true })
	await writeFile(OUT, json)

	const summary = collections
		.map(c => `${Object.keys(c.icons).length} from ${c.prefix}`)
		.join(', ')
	console.log(`[flags] bundled ${total} icons (${summary}) -> ${(json.length / 1024).toFixed(1)} KB`)
}

main().catch(err => {
	console.error('[flags] generation failed:', err)
	process.exit(1)
})
