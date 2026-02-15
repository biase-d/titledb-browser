<script>
    import Icon from '@iconify/svelte'

    let { items = [] } = $props()
</script>

<nav aria-label="Breadcrumb" class="breadcrumbs">
    <ol itemscope itemtype="https://schema.org/BreadcrumbList">
        <li
            itemprop="itemListElement"
            itemscope
            itemtype="https://schema.org/ListItem"
        >
            <a href="/" itemprop="item">
                <Icon icon="mdi:home" />
                <span itemprop="name">Home</span>
            </a>
            <meta itemprop="position" content="1" />
        </li>

        {#each items as item, i}
            <li class="separator" aria-hidden="true">
                <Icon icon="mdi:chevron-right" />
            </li>
            <li
                itemprop="itemListElement"
                itemscope
                itemtype="https://schema.org/ListItem"
            >
                {#if item.href}
                    <a href={item.href} itemprop="item">
                        <span itemprop="name">{item.label}</span>
                    </a>
                {:else}
                    <span itemprop="name" class="current">{item.label}</span>
                {/if}
                <meta itemprop="position" content={i + 2} />
            </li>
        {/each}
    </ol>
</nav>

<style>
    .breadcrumbs {
        margin: 1.5rem 0;
        padding: 0 0.5rem;
    }

    ol {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.5rem;
        font-size: 0.85rem;
        color: var(--text-secondary);
    }

    li {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    a {
        color: inherit;
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 0.25rem;
        transition: color 0.2s;
    }

    a:hover {
        color: var(--primary-color);
    }

    .current {
        color: var(--text-primary);
        font-weight: 600;
    }

    .separator {
        opacity: 0.5;
    }
</style>
