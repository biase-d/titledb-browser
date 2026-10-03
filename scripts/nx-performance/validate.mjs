#!/usr/bin/env node
/**
 * Validates the nx-performance data repository (layout v3)
 *
 * Lives in this repo only until it is copied into nx-performance as
 * scripts/validate.mjs; it reads that repository's folders, not this one's
 *
 *   node scripts/validate.mjs                 check everything
 *   node scripts/validate.mjs <changed files>  report only findings that involve those files
 *
 * The checks that compare files with each other (a title in two groups, data
 * filed under a title that has since been grouped) always read the whole
 * repository, because a PR can break them by touching one file. With a list of
 * changed files, a finding is reported only when it involves one of them, so
 * mistakes already in the repository do not block unrelated PRs
 *
 * Exit status 1 when there is at least one error. Warnings never fail the run
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'

const ROOT = process.cwd()
const TITLE_ID = /^[0-9A-F]{16}$/
const RESOLUTION = /^\d{3,5}x\d{3,5}$/
const RESOLUTION_TYPES = ['Fixed', 'Dynamic', 'Multiple Fixed']
const FPS_BEHAVIORS = ['Locked', 'Stable', 'Unstable', 'Very Unstable']
const MODES = ['docked', 'handheld']
const PROFILE_KEYS = new Set(['contributor', ...MODES])
const MODE_KEYS = new Set(['resolution_type', 'resolution', 'min_res', 'max_res', 'resolutions', 'resolution_notes', 'fps_behavior', 'target_fps', 'fps_notes'])
const GRAPHICS_KEYS = new Set(['contributor', 'docked', 'handheld', 'shared'])

/** @type {Array<{ level: 'error' | 'warning', paths: string[], message: string }>} */
const findings = []
const error = (/** @type {string | string[]} */ paths, /** @type {string} */ message) => findings.push({ level: 'error', paths: [paths].flat(), message })
const warn = (/** @type {string | string[]} */ paths, /** @type {string} */ message) => findings.push({ level: 'warning', paths: [paths].flat(), message })

const isObject = (/** @type {any} */ v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/** @param {string} dir */
function list (dir) {
	return existsSync(join(ROOT, dir)) ? readdirSync(join(ROOT, dir)).sort() : []
}

/** @param {string} path @returns {any} undefined when unreadable, after reporting it */
function readJson (path) {
	try {
		return JSON.parse(readFileSync(join(ROOT, path), 'utf8'))
	} catch (e) {
		error(path, `Not valid JSON: ${/** @type {Error} */ (e).message}`)
		return undefined
	}
}

/** @param {string} path @param {any} contributor */
function checkContributor (path, contributor) {
	if (contributor === undefined) return
	const names = Array.isArray(contributor) ? contributor : [contributor]
	if (names.length === 0) {
		warn(path, '"contributor" is empty, so nobody is credited')
	} else if (names.some(n => typeof n !== 'string' || n.trim() === '')) {
		error(path, '"contributor" must be a name, or a list of names, with no blank entries')
	} else if (names.some(n => n !== n.trim())) {
		warn(path, '"contributor" has a name with leading or trailing spaces, so it will not match the same person elsewhere')
	}
}

/** @param {string} path @param {string} mode @param {any} data */
function checkProfileMode (path, mode, data) {
	if (!isObject(data)) return error(path, `"${mode}" must be an object`)

	for (const key of Object.keys(data)) {
		if (!MODE_KEYS.has(key)) warn(path, `${mode}.${key} is not a field the site reads`)
	}

	if (!RESOLUTION_TYPES.includes(data.resolution_type)) {
		error(path, `${mode}.resolution_type must be one of ${RESOLUTION_TYPES.join(', ')} (found ${JSON.stringify(data.resolution_type)})`)
	}
	if (!FPS_BEHAVIORS.includes(data.fps_behavior)) {
		error(path, `${mode}.fps_behavior must be one of ${FPS_BEHAVIORS.join(', ')} (found ${JSON.stringify(data.fps_behavior)})`)
	}
	if (data.target_fps !== null && !(Number.isInteger(data.target_fps) && data.target_fps > 0)) {
		error(path, `${mode}.target_fps must be a positive whole number, or null (found ${JSON.stringify(data.target_fps)})`)
	}

	// What each resolution type needs to say something useful
	if (data.resolution_type === 'Fixed' && !RESOLUTION.test(data.resolution ?? '')) {
		error(path, `${mode}.resolution must look like 1920x1080 for a Fixed resolution (found ${JSON.stringify(data.resolution)})`)
	}
	if (data.resolution_type === 'Dynamic') {
		for (const key of ['min_res', 'max_res']) {
			if (data[key] !== undefined && !RESOLUTION.test(data[key])) {
				error(path, `${mode}.${key} must look like 1920x1080 (found ${JSON.stringify(data[key])})`)
			}
		}
	}
	if (data.resolution_type === 'Multiple Fixed' && !(typeof data.resolutions === 'string' && data.resolutions.trim())) {
		error(path, `${mode}.resolutions must list the resolutions, e.g. "1920x1080, 1280x720", for Multiple Fixed`)
	}
}

/** @param {string} path @param {any} data */
function checkProfile (path, data) {
	if (!isObject(data)) return error(path, 'A profile must be a JSON object')
	for (const key of Object.keys(data)) {
		if (!PROFILE_KEYS.has(key)) error(path, `Unknown key "${key}". A profile has "contributor", "docked" and "handheld"`)
	}
	checkContributor(path, data.contributor)
	// A file holding only a contributor is a placeholder that credits someone
	// before the numbers exist. It is allowed, and the site does not count it
	for (const mode of MODES) {
		if (data[mode] !== undefined) checkProfileMode(path, mode, data[mode])
	}
	if (data.docked === undefined && data.handheld === undefined && data.contributor === undefined) {
		error(path, 'Empty profile: it has neither a contributor nor docked/handheld data')
	}
}

/** @param {string} path @param {any} data */
function checkGraphics (path, data) {
	if (!isObject(data)) return error(path, 'Graphics settings must be a JSON object')
	for (const key of Object.keys(data)) {
		if (!GRAPHICS_KEYS.has(key)) error(path, `Unknown key "${key}". Graphics settings have "contributor", "docked", "handheld" and "shared"`)
	}
	checkContributor(path, data.contributor)
	for (const mode of MODES) {
		const m = data[mode]
		if (m === undefined) continue
		if (!isObject(m)) { error(path, `"${mode}" must be an object`); continue }
		const fps = m.framerate
		if (fps?.lockType !== undefined && fps.lockType !== 'Unlocked' && fps.targetFps !== undefined &&
			!(Number.isFinite(fps.targetFps) && fps.targetFps > 0)) {
			error(path, `${mode}.framerate.targetFps must be a positive number (found ${JSON.stringify(fps.targetFps)})`)
		}
	}
}

/** @param {string} path @param {any} data */
function checkVideos (path, data) {
	if (!Array.isArray(data)) return error(path, 'Videos must be a JSON list')
	data.forEach((entry, i) => {
		if (!isObject(entry)) return error(path, `Entry ${i + 1} must be an object`)
		let ok = false
		try { ok = ['http:', 'https:'].includes(new URL(entry.url).protocol) } catch { /* reported below */ }
		if (!ok) error(path, `Entry ${i + 1}: "url" must be a full http(s) link (found ${JSON.stringify(entry.url)})`)
	})
}

// ---- read everything -------------------------------------------------------

/** group file name (the group's ID) -> its title IDs */
const groups = new Map()
/** title ID -> the group files that list it */
const memberOf = new Map()

for (const file of list('groups')) {
	const path = `groups/${file}`
	if (!file.endsWith('.json')) { warn(path, 'Not a .json file; the site ignores it'); continue }
	const id = basename(file, '.json')
	if (!TITLE_ID.test(id)) error(path, `The file name is the group's ID and must be 16 hex digits in capitals (found "${id}")`)

	const data = readJson(path)
	if (data === undefined) continue
	if (!Array.isArray(data) || data.length === 0 || data.some(t => typeof t !== 'string')) {
		error(path, 'A group file must be a non-empty list of title IDs')
		continue
	}
	for (const t of data) if (!TITLE_ID.test(t)) error(path, `"${t}" is not a title ID (16 hex digits in capitals)`)
	if (new Set(data).size !== data.length) error(path, 'The same title ID is listed more than once')
	if (data.length === 1 && data[0] === id) warn(path, 'A group of one title that is its own ID is the default, so this file does nothing')

	groups.set(id, data)
	for (const t of new Set(data)) memberOf.set(t, [...(memberOf.get(t) ?? []), id])
}

for (const [title, files] of memberOf) {
	if (files.length > 1) {
		error(files.map(f => `groups/${f}.json`), `Title ${title} is in ${files.length} groups (${files.join(', ')}). A title can belong to only one`)
	}
}

/** Data key (a group ID) -> the paths holding data for it */
const dataKeys = new Map()
const addKey = (/** @type {string} */ key, /** @type {string} */ path) => dataKeys.set(key, [...(dataKeys.get(key) ?? []), path])

for (const dir of list('profiles')) {
	const dirPath = `profiles/${dir}`
	if (!statSync(join(ROOT, dirPath)).isDirectory()) { error(dirPath, 'Expected a folder named for a group ID'); continue }
	if (!TITLE_ID.test(dir)) error(dirPath, `Folder name must be a group ID: 16 hex digits in capitals (found "${dir}")`)
	for (const file of list(dirPath)) {
		const path = `${dirPath}/${file}`
		if (!file.endsWith('.json')) { error(path, 'Not a .json file'); continue }
		const version = basename(file, '.json').split('$')[0]
		if (!version || version !== version.trim()) error(path, 'The version in the file name is empty or has stray spaces. The name is "<version>.json" or "<version>$<suffix>.json"')
		const data = readJson(path)
		if (data !== undefined) checkProfile(path, data)
		addKey(dir, path)
	}
}

for (const [dir, check] of /** @type {const} */ ([['graphics', checkGraphics], ['videos', checkVideos]])) {
	for (const file of list(dir)) {
		const path = `${dir}/${file}`
		if (!file.endsWith('.json')) { error(path, 'Not a .json file'); continue }
		const key = basename(file, '.json')
		if (!TITLE_ID.test(key)) error(path, `File name must be a group ID: 16 hex digits in capitals (found "${key}")`)
		const data = readJson(path)
		if (data !== undefined) check(path, data)
		addKey(key, path)
	}
}

// Data filed under a title that has since been put into another group. The
// site looks data up by group, so this is data nobody can see. It is what
// happened when a regional release was grouped after its profiles were written
for (const [key, paths] of dataKeys) {
	const owners = (memberOf.get(key) ?? []).filter(g => g !== key)
	if (owners.length > 0 && !groups.has(key)) {
		error(paths, `This data is filed under ${key}, which is now part of group ${owners[0]}. Move it to ${owners[0]} (merge it with that group's data if it has any)`)
	} else if (owners.length > 0) {
		warn(paths, `${key} has its own group file but is also listed in group ${owners[0]}`)
	}
}

// ---- report ----------------------------------------------------------------

const changed = process.argv.slice(2).map(f => f.replace(/^\.\//, '')).filter(Boolean)
const relevant = findings.filter(f => changed.length === 0 || f.paths.some(p => changed.includes(p) || changed.some(c => c.startsWith(`${p}/`))))

for (const f of relevant) console.log(`${f.level.toUpperCase()} ${f.paths[0]}: ${f.message}`)

const errors = relevant.filter(f => f.level === 'error').length
const warnings = relevant.length - errors
const scope = changed.length > 0 ? `${changed.length} changed file(s)` : 'the whole repository'
console.log(`\nChecked ${scope}: ${errors} error(s), ${warnings} warning(s)`)
if (changed.length > 0) {
	const hidden = findings.length - relevant.length
	if (hidden > 0) console.log(`(${hidden} more finding(s) exist elsewhere in the repository and are not part of this change)`)
}
process.exit(errors > 0 ? 1 : 0)
