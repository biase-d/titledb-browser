import { json } from '@sveltejs/kit';
import { getVersionInfo } from '$lib/services/versionService';

/** @type {import('./$types').RequestHandler} */
export const GET = async () => {
    const info = getVersionInfo();
    return json(info);
};
