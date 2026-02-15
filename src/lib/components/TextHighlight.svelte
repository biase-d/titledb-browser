<script>
    /** @type {{ text: string, query: string }} */
    let { text, query } = $props();

    /**
     * @param {string} fullText
     * @param {string} searchTerm
     */
    function getHighlightedParts(fullText, searchTerm) {
        if (!searchTerm || !searchTerm.trim()) {
            return [{ text: fullText, highlight: false }];
        }

        const escapedQuery = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(${escapedQuery})`, "gi");
        const parts = fullText.split(regex);

        return parts.map((part) => ({
            text: part,
            highlight: part.toLowerCase() === searchTerm.toLowerCase(),
        }));
    }

    let parts = $derived(getHighlightedParts(text, query));
</script>

{#each parts as part}
    {#if part.highlight}
        <mark class="highlight">{part.text}</mark>
    {:else}
        {part.text}
    {/if}
{/each}

<style>
    .highlight {
        background-color: var(--primary-color);
        color: var(--primary-action-text);
        padding: 0 2px;
        border-radius: 2px;
        font-weight: inherit;
    }
</style>
