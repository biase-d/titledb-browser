<script>
  import { onDestroy } from "svelte";
  import { draftsStore } from "$lib/stores";
  import { onMount } from "svelte";
  import Icon from "@iconify/svelte";

  let drafts = $state([]);

  /**
     * @type {import("svelte/store").Unsubscriber}
     */
  let unsubscribe;

  onMount(() => {
    unsubscribe = draftsStore.subscribe((d) => {
      drafts = d;
    });
  });

  onDestroy(() => {
    unsubscribe?.();
  });

  function deleteAllDrafts() {
    const confirmDelete = confirm(
      "Are you sure you want to delete all drafts? This action cannot be undone."
    );

    if (confirmDelete) {
      for (const draft of drafts) {
        draftsStore.delete(draft.id);
      }
    }
  }
</script>

{#if drafts.length > 0}
  <div class="drafts-section">
    <div class="section-header-wrapper">
      <h2 class="section-header">Saved Drafts</h2>
      <button
        class="delete-all-drafts-btn"
        onclick={deleteAllDrafts}
        title="Delete all drafts"
      >
        Delete All
      </button>
    </div>

    <ul class="drafts-list">
      {#each drafts as draft (draft.id)}
        <li class="draft-item">
          <a
            href={`/contribute/${draft.id}?from_draft=true`}
            class="draft-link"
            aria-label={`Continue editing ${draft.data.name || "Untitled Draft"}`}
          >
            <div>
              <span class="title-name">{draft.data.name || "Untitled Draft"}</span>
              <span class="title-id">({draft.id})</span>
            </div>

            <span class="continue-editing">
              Continue Editing
              <Icon icon="mdi:arrow-right" />
            </span>
          </a>

          <button
            class="draft-delete"
            onclick={() => draftsStore.delete(draft.id)}
            title="Delete draft"
            aria-label={`Delete draft ${draft.data.name || draft.id}`}
          >
            <Icon icon="mdi:delete" width="20" height="20" />
          </button>
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .drafts-section {
    margin-top: 0;
  }

  .section-header-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .drafts-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .draft-item {
    display: flex;
    align-items: center;
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .draft-item:hover {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 1px var(--primary-color);
  }

  .draft-link {
    flex-grow: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    text-decoration: none;
    color: inherit;
  }

  .draft-link:hover {
    text-decoration: none;
  }

  .title-name {
    font-weight: 500;
    color: var(--text-primary);
  }

  .title-id {
    display: block;
    margin-top: 0.1rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .continue-editing {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--primary-color);
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }

  .draft-delete {
    padding: 0.75rem;
    border: none;
    border-left: 1px solid var(--border-color);
    background: none;
    color: var(--text-secondary);
    cursor: pointer;
    transition: color 0.2s ease;
  }

  .draft-delete:hover {
    color: #e53e3e;
  }

  .delete-all-drafts-btn {
    background: none;
    border: none;
    color: #ef4444;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    transition: background-color 0.2s ease;
  }

  .delete-all-drafts-btn:hover {
    background-color: rgba(239, 68, 68, 0.1);
  }
</style>
