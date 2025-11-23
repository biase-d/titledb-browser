<script>
    import { fade, scale } from 'svelte/transition';
    import Icon from '@iconify/svelte';
    import { preferences, COUNTRY_GROUPS } from '$lib/stores/preferences';
    import { onMount } from 'svelte';

    let show = $state(false);
    let step = $state(1);
    let selectedRegion = $state('US');

    onMount(() => {
        const hasOnboarded = localStorage.getItem('has_onboarded');

        if (!hasOnboarded) {
            // Pre-select current preference if it exists
            const current = localStorage.getItem('preferred_region');
            if (current) selectedRegion = current;
            
            // Delay slightly for smooth entrance
            setTimeout(() => { show = true; }, 500);
        }
    });

    function nextStep() {
        if (step === 1) {
            step = 2;
        } else {
            finish();
        }
    }

    function finish() {
        // Save the region preference
        preferences.setRegion(selectedRegion);
        
        // Mark onboarding as complete
        localStorage.setItem('has_onboarded', 'true');
        
        show = false;
    }
</script>

{#if show}
    <div class="modal-overlay" transition:fade={{ duration: 300 }}>
        <div class="modal-content" transition:scale={{ duration: 300, start: 0.95 }}>
            
            {#if step === 1}
                <div class="step-container" in:fade={{ duration: 200 }}>
                    <div class="icon-header">
                        <Icon icon="mdi:earth" width="48" height="48" />
                    </div>
                    <h2>Welcome to Switch Performance</h2>
                    <p class="subtitle">
                        To give you the best experience, please select your preferred eShop country. 
                        We will prioritize game versions, names, and icons from this region
                    </p>

                    <div class="select-wrapper">
                        <select bind:value={selectedRegion}>
                            {#each COUNTRY_GROUPS as group}
                                <optgroup label={group.label}>
                                    {#each group.options as country}
                                        <option value={country.id}>
                                            {country.flag} {country.label}
                                        </option>
                                    {/each}
                                </optgroup>
                            {/each}
                        </select>
                        <Icon icon="mdi:chevron-down" class="select-arrow" />
                    </div>

                    <button class="primary-btn" onclick={nextStep}>
                        Continue <Icon icon="mdi:arrow-right" />
                    </button>
                </div>
            {:else}
                <div class="step-container" in:fade={{ duration: 200 }}>
                    <div class="icon-header">
                        <Icon icon="mdi:rocket-launch" width="48" height="48" />
                    </div>
                    <h2>Quick Guide</h2>
                    
                    <div class="features-list">
                        <div class="feature">
                            <div class="feature-icon"><Icon icon="mdi:tag-text-outline" /></div>
                            <div class="feature-text">
                                <strong>Smart Localization</strong>
                                <p>Game titles and IDs will automatically match your selected region</p>
                            </div>
                        </div>
                        <div class="feature">
                            <div class="feature-icon"><Icon icon="mdi:speedometer" /></div>
                            <div class="feature-text">
                                <strong>Performance Data</strong>
                                <p>Check Docked and Handheld FPS targets, resolution, and stability ratings</p>
                            </div>
                        </div>
                        <div class="feature">
                            <div class="feature-icon"><Icon icon="mdi:github" /></div>
                            <div class="feature-text">
                                <strong>Community Driven</strong>
                                <p>Sign in with GitHub to submit new data or suggest edits to existing games</p>
                            </div>
                        </div>
                    </div>

                    <button class="primary-btn" onclick={finish}>
                        Get Started
                    </button>
                </div>
            {/if}

            <div class="stepper">
                <div class="dot" class:active={step === 1}></div>
                <div class="dot" class:active={step === 2}></div>
            </div>
        </div>
    </div>
{/if}

<style>
    .modal-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center;
        z-index: 200; /* Higher than standard modals */
    }

    .modal-content {
        background-color: var(--surface-color);
        width: 90%;
        max-width: 450px;
        border-radius: var(--radius-lg);
        box-shadow: 0 20px 50px rgba(0,0,0,0.3);
        display: flex;
        flex-direction: column;
        border: 1px solid var(--border-color);
        overflow: hidden;
    }

    .step-container {
        padding: 2.5rem 2rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
    }

    .icon-header {
        color: var(--primary-color);
        margin-bottom: 1.5rem;
        background: color-mix(in srgb, var(--primary-color) 10%, transparent);
        padding: 1rem;
        border-radius: 50%;
    }

    h2 {
        margin: 0 0 1rem;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-primary);
    }

    .subtitle {
        margin: 0 0 2rem;
        color: var(--text-secondary);
        line-height: 1.6;
    }

    .select-wrapper {
        position: relative;
        width: 100%;
        margin-bottom: 2rem;
    }

    select {
        width: 100%;
        appearance: none;
        background-color: var(--input-bg);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        padding: 14px 16px;
        font-size: 1.1rem;
        color: var(--text-primary);
        cursor: pointer;
        transition: border-color 0.2s, box-shadow 0.2s;
    }

    select:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 20%, transparent);
    }

    .select-arrow {
        position: absolute;
        right: 16px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        color: var(--text-secondary);
    }

    .primary-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background-color: var(--primary-color);
        color: var(--primary-action-text);
        border: none;
        padding: 12px 32px;
        border-radius: 999px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
    }

    .primary-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }

    /* Features List */
    .features-list {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        margin-bottom: 2rem;
        text-align: left;
        width: 100%;
    }

    .feature {
        display: flex;
        gap: 1rem;
    }

    .feature-icon {
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        background-color: var(--input-bg);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--primary-color);
        font-size: 1.2rem;
    }

    .feature-text strong {
        display: block;
        margin-bottom: 0.25rem;
        color: var(--text-primary);
    }

    .feature-text p {
        margin: 0;
        font-size: 0.9rem;
        color: var(--text-secondary);
        line-height: 1.4;
    }

    /* Stepper Dots */
    .stepper {
        display: flex;
        justify-content: center;
        gap: 0.5rem;
        padding-bottom: 1.5rem;
    }

    .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: var(--border-color);
        transition: background-color 0.3s;
    }

    .dot.active {
        background-color: var(--primary-color);
    }
</style>