import { error } from '@sveltejs/kit';
import { getCachedTitleDetail, setCachedTitleDetail } from '$lib/db.js';
import { browser } from '$app/environment';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, params, parent }) {
  const { session } = await parent();
  const { id } = params;

  if (browser) {
    const cachedGame = await getCachedTitleDetail(id);
    if (cachedGame) {
      return { game: cachedGame, session };
    }
  }

  try {
    const res = await fetch(`/api/v1/games/${id}`);

    if (res.ok) {
      const gameData = await res.json();

      if (browser) {
        setCachedTitleDetail(id, gameData);
      }

      return { game: gameData, session };
    }

    throw error(res.status, await res.text());

  } catch (e) {
    console.error("Failed to load game data:", e);
    if (e.status) throw e;
    throw error(500, "Could not load game data.");
  }
}