import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, params, parent }) {
    const { session } = await parent();
    const { id } = params;

    try {
      const res = await fetch(`/api/v1/games/${id}`);
      if (res.ok) {
          const gameData = await res.json();
          
          return { game: gameData, session };
      }
      throw error(res.status, await res.text());
    } catch (e) {
        if (e.status) throw e;
        throw error(500, "Could not load game data.");
    }
}