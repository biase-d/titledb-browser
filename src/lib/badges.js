/**
 * The contribution badges, from the most to the least demanding
 *
 * One list for the profile, the contribute page and the services, so a
 * threshold changed here changes everywhere
 */

/** @typedef {{ threshold: number, name: string, color: string, icon: string }} Badge */

/** @type {Badge[]} */
export const BADGES = [
	{ threshold: 1, name: 'Shroom Stomper', color: '#a16207', icon: 'mdi:mushroom' },
	{ threshold: 5, name: 'Grumpy Gator', color: '#16a34a', icon: 'mdi:shark' },
	{ threshold: 15, name: 'Floating Brain Jelly', color: '#f59e0b', icon: 'mdi:jellyfish' },
	{ threshold: 30, name: 'Spooky Robe Guy', color: '#e11d48', icon: 'mdi:ghost' },
	{ threshold: 50, name: 'Big Buff Croc', color: '#78716c', icon: 'mdi:arm-flex' },
	{ threshold: 100, name: 'Evil Gray Twin', color: '#4f46e5', icon: 'mdi:sword-cross' },
	{ threshold: 200, name: 'King K. Roolish', color: '#facc15', icon: 'mdi:crown' },
	{ threshold: 300, name: 'Big Purple Pterodactyl', color: '#8b5cf6', icon: 'mdi:bird' },
	{ threshold: 400, name: 'Ancient Angel Borb', color: '#d1d5db', icon: 'mdi:shield-star' },
	{ threshold: 500, name: 'Creative Right Hand', color: '#fde047', icon: 'mdi:hand-back-right' }
].sort((a, b) => b.threshold - a.threshold)

/**
 * The highest badge a count has earned
 * @param {number} total
 * @returns {Badge | null}
 */
export function badgeFor (total) {
	return BADGES.find(b => total >= b.threshold) || null
}

/**
 * Where a contribution count stands against the badges
 * @param {number} total
 */
export function badgeProgress (total) {
	const next = [...BADGES].reverse().find(b => total < b.threshold) || null
	const current = badgeFor(total)
	const from = current?.threshold ?? 0
	return {
		total,
		current,
		next,
		remaining: next ? next.threshold - total : 0,
		fraction: next ? (total - from) / (next.threshold - from) : 1
	}
}
