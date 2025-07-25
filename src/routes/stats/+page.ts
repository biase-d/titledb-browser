import { fullIndexUrl } from '$lib/index.js';
import { fullTitleIndex } from '$lib/stores';
import { get } from 'svelte/store';

export async function load({ fetch }) {
    const existingData = get(fullTitleIndex);
    if (existingData.length > 0) {
        return { titles: existingData };
    }

    try {
        const res = await fetch(fullIndexUrl);
        if (res.ok) {
            const titles = await res.json();
            fullTitleIndex.set(titles);
            return { titles };
        }
    } catch (e) {
        console.error("Failed to load stats data:", e);
    }

    return { titles: [] };
}