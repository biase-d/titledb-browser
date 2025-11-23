import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { invalidateAll } from '$app/navigation';

// Comprehensive list of eShop regions for the settings dropdown
export const COUNTRY_GROUPS = [
    {
        label: 'The Americas',
        options: [
            { id: 'US', label: 'United States', flag: '🇺🇸' },
            { id: 'CA', label: 'Canada', flag: '🇨🇦' },
            { id: 'MX', label: 'Mexico', flag: '🇲🇽' },
            { id: 'BR', label: 'Brazil', flag: '🇧🇷' },
            { id: 'AR', label: 'Argentina', flag: '🇦🇷' },
            { id: 'CL', label: 'Chile', flag: '🇨🇱' },
            { id: 'CO', label: 'Colombia', flag: '🇨🇴' },
            { id: 'PE', label: 'Peru', flag: '🇵🇪' }
        ]
    },
    {
        label: 'Asia Pacific',
        options: [
            { id: 'JP', label: 'Japan', flag: '🇯🇵' },
            { id: 'KR', label: 'Korea', flag: '🇰🇷' },
            { id: 'HK', label: 'Hong Kong', flag: '🇭🇰' },
            { id: 'TW', label: 'Taiwan', flag: '🇹🇼' },
            { id: 'CN', label: 'China', flag: '🇨🇳' },
            { id: 'AU', label: 'Australia', flag: '🇦🇺' },
            { id: 'NZ', label: 'New Zealand', flag: '🇳🇿' }
        ]
    },
    {
        label: 'Europe',
        options: [
            { id: 'GB', label: 'United Kingdom', flag: '🇬🇧' },
            { id: 'FR', label: 'France', flag: '🇫🇷' },
            { id: 'DE', label: 'Germany', flag: '🇩🇪' },
            { id: 'IT', label: 'Italy', flag: '🇮🇹' },
            { id: 'ES', label: 'Spain', flag: '🇪🇸' },
            { id: 'NL', label: 'Netherlands', flag: '🇳🇱' },
            { id: 'PT', label: 'Portugal', flag: '🇵🇹' },
            { id: 'RU', label: 'Russia', flag: '🇷🇺' },
            { id: 'SE', label: 'Sweden', flag: '🇸🇪' },
            { id: 'NO', label: 'Norway', flag: '🇳🇴' },
            { id: 'DK', label: 'Denmark', flag: '🇩🇰' },
            { id: 'FI', label: 'Finland', flag: '🇫🇮' },
            { id: 'PL', label: 'Poland', flag: '🇵🇱' }
        ]
    },
    {
        label: 'Africa',
        options: [
            { id: 'ZA', label: 'South Africa', flag: '🇿🇦' }
        ]
    }
];

function createPreferencesStore() {
    // Default to US if nothing is set
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