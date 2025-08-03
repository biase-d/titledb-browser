<script>
    import Icon from "@iconify/svelte";

    let { gameVersion = $bindable() } = $props()
</script>

<div class="version-input-container">
    <label for="game_version">
        Tested Game Version
        <div class="tooltip">
            <Icon icon="mdi:help-circle-outline" />
            <span class="tooltip-text">
                Find this on the Switch Home screen by highlighting the game, pressing the '+' button, and looking at the version number below the title
            </span>
        </div>
    </label>
    <input
        type="text"
        id="game_version"
        bind:value={gameVersion}
        placeholder="e.g. 1.1.0"
        title="Please enter a version number in the format X.X.X (e.g. 1.1.0)"
        required
    />
</div>

<style>
    input {
		width: 100%;
		padding: 10px 12px;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: 6px;
		color: var(--text-primary);
		box-sizing: border-box;
	}
    .version-input-container {
        margin-bottom: 2.5rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid var(--border-color);
    }
    .version-input-container label {
        font-weight: 500;
        margin-bottom: 0.5rem;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }
    .tooltip {
        position: relative;
        display: inline-flex;
        align-items: center;
        color: var(--text-secondary);
    }
    .tooltip .tooltip-text {
        visibility: hidden;
        width: 250px;
        background-color: #333;
        color: #fff;
        text-align: left;
        border-radius: 6px;
        padding: 8px;
        position: absolute;
        z-index: 1;
        bottom: 125%;
        left: 50%;
        margin-left: -125px;
        opacity: 0;
        transition: opacity 0.3s;
        font-size: 0.8rem;
        line-height: 1.4;
    }
    .tooltip:hover .tooltip-text {
        visibility: visible;
        opacity: 1;
    }
</style>