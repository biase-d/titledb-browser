import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/svelte'
import PerformanceComparisonModal from '../src/routes/title/[id]/PerformanceComparisonModal.svelte'

const history = [
	{ id: 1, gameVersion: '1.2.0', suffix: '', profiles: { docked: { target_fps: 30 }, handheld: {} } },
	{ id: 2, gameVersion: '1.1.0', suffix: '', profiles: { docked: { target_fps: 60 }, handheld: {} } },
	{ id: 3, gameVersion: '1.0.0', suffix: '', profiles: { docked: { target_fps: 30 }, handheld: {} } }
]

describe('comparing versions', () => {
	it('adds a version to the table when it is chosen', async () => {
		const { container } = render(PerformanceComparisonModal, { props: { show: true, performanceHistory: history } })
		expect(container.querySelectorAll('.comparison-table thead th')).toHaveLength(2)

		const tags = container.querySelectorAll('.version-tag')
		await fireEvent.click(tags[1])
		expect(container.querySelectorAll('.comparison-table thead th')).toHaveLength(3)
		expect(container.querySelectorAll('.version-tag.selected')).toHaveLength(2)

		await fireEvent.click(tags[2])
		expect(container.querySelectorAll('.comparison-table thead th')).toHaveLength(4)
	})

	it('takes a version out again, but never the last one', async () => {
		const { container } = render(PerformanceComparisonModal, { props: { show: true, performanceHistory: history } })
		const tags = container.querySelectorAll('.version-tag')
		await fireEvent.click(tags[1])
		await fireEvent.click(tags[1])
		expect(container.querySelectorAll('.version-tag.selected')).toHaveLength(1)

		await fireEvent.click(tags[0])
		expect(container.querySelectorAll('.version-tag.selected')).toHaveLength(1)
	})
})
