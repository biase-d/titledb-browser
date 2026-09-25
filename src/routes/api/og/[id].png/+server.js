import { redirect } from '@sveltejs/kit'

/**
 * The cards were PNG until the format changed to JPEG, which cut them from
 * 1.2 MB to about 100 KB. Links shared before that still carry the .png URL and
 * some scrapers refetch rather than serving what they cached, so this keeps
 * those previews working instead of turning them into 404s
 *
 * @type {import('./$types').RequestHandler}
 */
export function GET ({ params, url }) {
	redirect(301, `/api/og/${params.id}.jpg${url.search}`)
}
