import { json, error } from '@sveltejs/kit'
import * as statsRepo from '$lib/repositories/statsRepository'

export const GET = async ({ url, locals }) => {
	try {
		const db = locals.db
		const stats = await statsRepo.getStats(db, url.searchParams)
		return json(stats)
	} catch (err) {
		console.error('API Error in /api/v1/stats:', err)
		throw error(500, 'An internal server error occurred.')
	}
}
