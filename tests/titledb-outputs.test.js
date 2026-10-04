// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { readTitledbOutputs, getBaseId } from '../src/lib/pipeline/data-sources.js'
import { isSwitch2Id, platformOf, asPlatform } from '../src/lib/platform.js'

let repo
const write = (rel, data) => { mkdirSync(path.dirname(path.join(repo, rel)), { recursive: true }); writeFileSync(path.join(repo, rel), JSON.stringify(data)) }

beforeAll(() => {
	repo = mkdtempSync(path.join(tmpdir(), 'titledb-'))
	write('output/main.json', { '0100A3D000196000': ['One'] })
	write('output/main_regions.json', { '0100A3D000196000': ['US'] })
	write('output2/main.json', { '040078001CCF6000': ['Two', 'Zwei'] })
	write('output2/main_regions.json', { '040078001CCF6000': ['MY', 'SG'] })
})
afterAll(() => rmSync(repo, { recursive: true, force: true }))

describe('readTitledbOutputs', () => {
	it('combines the Switch and Switch 2 outputs and lists where each one\'s details are', async () => {
		const out = await readTitledbOutputs(repo)
		expect(Object.keys(out.mainGamesList).sort()).toEqual(['0100A3D000196000', '040078001CCF6000'])
		expect(out.regionsList['040078001CCF6000']).toEqual(['MY', 'SG'])
		expect(out.titleIdDirs.length).toBe(2)
		expect(out.titleIdDirs[1].endsWith(path.join('output2', 'titleid'))).toBe(true)
	})

	it('still works when there is no Switch 2 folder', async () => {
		const bare = mkdtempSync(path.join(tmpdir(), 'titledb-bare-'))
		mkdirSync(path.join(bare, 'output'), { recursive: true })
		writeFileSync(path.join(bare, 'output', 'main.json'), JSON.stringify({ '0100A3D000196000': ['One'] }))
		const out = await readTitledbOutputs(bare)
		expect(Object.keys(out.mainGamesList)).toEqual(['0100A3D000196000'])
		expect(out.titleIdDirs.length).toBe(1)
		rmSync(bare, { recursive: true, force: true })
	})

	it('fails when the Switch library itself is missing', async () => {
		const empty = mkdtempSync(path.join(tmpdir(), 'titledb-empty-'))
		await expect(readTitledbOutputs(empty)).rejects.toThrow()
		rmSync(empty, { recursive: true, force: true })
	})
})

describe('platform', () => {
	it('reads the console from the title ID', () => {
		expect(isSwitch2Id('040078001CCF6000')).toBe(true)
		expect(isSwitch2Id('0100A3D000196000')).toBe(false)
		expect(platformOf('0400E140216D4000')).toBe('switch2')
		expect(platformOf(undefined)).toBe('switch')
		expect(asPlatform('switch2')).toBe('switch2')
		expect(asPlatform('anything else')).toBe('switch')
	})

	it('groups a Switch 2 title under its own base ID', () => {
		expect(getBaseId('040078001CCF6800')).toBe('040078001CCF6000')
	})
})
