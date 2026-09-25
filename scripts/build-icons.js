/**
 * Generates the bundled icon sets that the app registers with Iconify locally
 *
 * Without this, @iconify/svelte fetches every icon from api.iconify.design at
 * runtime: a third-party round trip on first render, nothing during SSR, and
 * icons that pop in after hydration. Two bundles come out of here:
 *
 *   flag-icons.json - the country flags, from KNOWN_REGION_CODES
 *   ui-icons.json   - every `prefix:name` literal in src/, for the UI sets
 *
 * The UI bundle is produced by scanning the source rather than from a hand-kept
 * list, because icon names are written inline all over the components (including
 * inside ternaries and lookup tables) and a list would drift immediately
 *
 * Run via `npm run build:icons` (wired into `prepare` and `build`)
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { KNOWN_REGION_CODES } from '../src/lib/regions.js'
import { getFlagIcon } from '../src/lib/flags.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(root, 'src/lib/generated/flag-icons.json')
const UI_OUT = resolve(root, 'src/lib/generated/ui-icons.json')

/** Icon sets the components draw from, installed as devDependencies */
const UI_PREFIXES = ['mdi', 'line-md']

/** @param {string} prefix */
async function loadSet (prefix) {
	const path = resolve(root, 'node_modules/@iconify-json', prefix, 'icons.json')
	return JSON.parse(await readFile(path, 'utf8'))
}

/** Walk src/ and collect every `prefix:name` literal for the UI sets */
async function scanUiIcons () {
	/** @type {Map<string, Set<string>>} */
	const wanted = new Map(UI_PREFIXES.map(prefix => [prefix, new Set()]))
	const pattern = new RegExp(`['"\`](${UI_PREFIXES.join('|')}):([a-z0-9][a-z0-9-]*)['"\`]`, 'g')

	/** @param {string} dir */
	async function walk (dir) {
		for (const entry of await readdir(dir, { withFileTypes: true })) {
			const full = join(dir, entry.name)
			if (entry.isDirectory()) {
				if (entry.name === 'generated' || entry.name === 'node_modules') continue
				await walk(full)
				continue
			}
			if (!/\.(svelte|js|ts)$/.test(entry.name)) continue
			const source = await readFile(full, 'utf8')
			for (const match of source.matchAll(pattern)) {
				wanted.get(match[1]).add(match[2])
			}
		}
	}

	await walk(resolve(root, 'src'))
	return wanted
}

async function buildUiBundle () {
	const wanted = await scanUiIcons()
	const collections = []
	const missing = []

	for (const [prefix, names] of wanted) {
		if (names.size === 0) continue
		const source = await loadSet(prefix)
		/** @type {Record<string, any>} */
		const icons = {}
		for (const name of [...names].sort()) {
			const icon = source.icons[name] ?? source.aliases?.[name]
			if (!icon) {
				missing.push(`${prefix}:${name}`)
				continue
			}
			icons[name] = icon
		}
		collections.push({ prefix, icons, width: source.width, height: source.height })
	}

	// A miss here is a typo in a component, or an icon that has been renamed
	// upstream. It would silently fall back to a network request at runtime,
	// so fail the build and name it instead
	if (missing.length) {
		throw new Error(`UI icons not found in their set: ${missing.join(', ')}`)
	}

	const json = JSON.stringify({ collections })
	await mkdir(dirname(UI_OUT), { recursive: true })
	await writeFile(UI_OUT, json)

	const total = collections.reduce((n, c) => n + Object.keys(c.icons).length, 0)
	const summary = collections.map(c => `${Object.keys(c.icons).length} from ${c.prefix}`).join(', ')
	console.log(`[icons] bundled ${total} UI icons (${summary}) -> ${(json.length / 1024).toFixed(1)} KB`)
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
	console.log(`[icons] bundled ${total} flags (${summary}) -> ${(json.length / 1024).toFixed(1)} KB`)

	await buildUiBundle()
}

main().catch(err => {
	console.error('[icons] generation failed:', err)
	process.exit(1)
})
