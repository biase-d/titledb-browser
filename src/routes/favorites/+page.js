import { error } from '@sveltejs/kit';
import { browser } from '$app/environment';
import { getFavorites } from '$lib/db.js';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
    if (!browser) {
        return { favoritedGames: [] };
    }

    try {
        const favoriteIds = Array.from(await getFavorites());

        if (favoriteIds.length === 0) {
            return { favoritedGames: [] };
        }

        const res = await fetch('/api/v1/games/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: favoriteIds })
        });

        if (res.ok) {
            const favoritedGames = await res.json();
            return { favoritedGames };
        }
        
        throw error(res.status, 'Failed to load favorite games from API.');

    } catch (e) {
        console.error("Failed to load favorites:", e);
        if (e.status) throw e;
        throw error(500, 'Could not load your favorites.');
    }
}