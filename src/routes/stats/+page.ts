import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, url }) {
    try {
        const res = await fetch(`/api/v1/stats?${url.searchParams.toString()}`);

        if (res.ok) {
            const statsData = await res.json();
            return { stats: statsData };
        }
        throw error(res.status, 'Failed to load statistics data from API.');
    } catch (e) {
        console.error("Failed to load stats data:", e);
        if (e.status) throw e;
        throw error(500, 'Could not load statistics.');
    }
}