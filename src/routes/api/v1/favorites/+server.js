import { json } from '@sveltejs/kit';
import * as favoritesService from '$lib/services/favoritesService';

/** @type {import('./$types').RequestHandler} */
export async function GET({ locals }) {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ favorites: [] });
  }

  const favorites = await favoritesService.getFavorites(session.user.id);
  return json({ favorites });
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { gameId } = await request.json();
  if (!gameId) {
    return json({ error: 'Missing gameId' }, { status: 400 });
  }

  await favoritesService.addFavorite(session.user.id, gameId);
  return json({ success: true });
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ request, locals }) {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { gameId } = await request.json();
  if (!gameId) {
    return json({ error: 'Missing gameId' }, { status: 400 });
  }

  await favoritesService.removeFavorite(session.user.id, gameId);
  return json({ success: true });
}