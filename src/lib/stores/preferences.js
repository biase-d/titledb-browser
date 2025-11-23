import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { invalidateAll } from '$app/navigation';

export const COUNTRY_GROUPS = [
    {
        label: 'The Americas',
        options: [
            { id: 'US', label: 'United States' },
            { id: 'CA', label: 'Canada' },
            { id: 'MX', label: 'Mexico' },
            { id: 'BR', label: 'Brazil' },
            { id: 'AR', label: 'Argentina' },
            { id: 'CL', label: 'Chile' },
            { id: 'CO', label: 'Colombia' },
            { id: 'PE', label: 'Peru' }
        ]
    },
    {
        label: 'Asia',
        options: [
            { id: 'JP', label: 'Japan' },
            { id: 'KR', label: 'Korea' },
            { id: 'HK', label: 'Hong Kong' },
            { id: 'TW', label: 'Taiwan' },
            { id: 'CN', label: 'China' }
        ]
    },
    {
        label: 'Oceania',
        options: [
            { id: 'AU', label: 'Australia' },
            { id: 'NZ', label: 'New Zealand' }
        ]
    },
    {
        label: 'Europe',
        options: [
            { id: 'GB', label: 'United Kingdom' },
            { id: 'FR', label: 'France' },
            { id: 'DE', label: 'Germany' },
            { id: 'IT', label: 'Italy' },
            { id: 'ES', label: 'Spain' },
            { id: 'NL', label: 'Netherlands' },
            { id: 'PT', label: 'Portugal' },
            { id: 'RU', label: 'Russia' },
            { id: 'SE', label: 'Sweden' },
            { id: 'NO', label: 'Norway' },
            { id: 'DK', label: 'Denmark' },
            { id: 'FI', label: 'Finland' },
            { id: 'PL', label: 'Poland' }
        ]
    },
    {
        label: 'Africa',
        options: [
            { id: 'ZA', label: 'South Africa' }
        ]
    }
];

function createPreferencesStore() {
    const initialRegion = browser 
        ? (localStorage.getItem('preferred_region') || 'US') 
        : 'US';

    const { subscribe, set, update } = writable({
        region: initialRegion
    });

    return {
        subscribe,
        /**
         * Updates the region preference
         * @param {string} regionCode - The 2-letter country code (e.g., 'JP')
         */
        setRegion: (regionCode) => {
            if (!browser) return;

            update(state => {
                const newState = { ...state, region: regionCode };
                localStorage.setItem('preferred_region', regionCode);
                document.cookie = `preferred_region=${regionCode}; path=/; max-age=31536000; SameSite=Lax`;
                return newState;
            });
            invalidateAll();
        }
    };
}

export const preferences = createPreferencesStore();