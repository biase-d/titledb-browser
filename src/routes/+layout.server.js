/** @type {import('./$types').LayoutServerLoad} */
export const load = async ({ locals }) => {

  return {
    session: await locals.auth()
  }
}