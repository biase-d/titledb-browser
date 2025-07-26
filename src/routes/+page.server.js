/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch, url }) {
    const response = await fetch(`/api/v1/games?${url.searchParams.toString()}`);

    if (response.ok) {
        return await response.json();
    }

    return {
        results: [],
        meta: { publishers: [], years: [] },
        pagination: { currentPage: 1, totalPages: 0, totalItems: 0 }
    };
}