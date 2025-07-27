import { mainUrl } from '$lib/index.js';

/** @type {import('./$types').LayoutServerLoad} */
export const load = async (event) => {
  const session = await event.locals.auth();
  let titleIndex = {};

  try {
    const res = await fetch(mainUrl);
    if (res.ok) {
      titleIndex = await res.json();
    }
  } catch (e) {
    console.error('Failed to fetch main title index:', e);
  }

  return {
    session,
    titleIndex
  };
};