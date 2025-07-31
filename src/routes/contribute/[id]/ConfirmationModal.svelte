<script>
import { fade } from 'svelte/transition';
import PerformanceDetail from '../../title/[id]/PerformanceDetail.svelte';
import GraphicsDetail from '../../title/[id]/GraphicsDetail.svelte';
import Icon from '@iconify/svelte';

let {
	performanceData = {},
	graphicsData = {},
	show = false,
	onConfirm = () => {},
	onCancel = () => {}
} = $props();

let hasGraphicsData = $state(false);

// Helper to check if any nested value is non-empty
function hasNonEmptyValue(obj) {
	if (obj == null) return false;
	if (typeof obj === 'string') return obj.trim() !== '';
	if (typeof obj === 'number') return true;
	if (typeof obj === 'boolean') return obj;
	if (Array.isArray(obj)) return obj.some(item => hasNonEmptyValue(item));
	if (typeof obj === 'object') return Object.values(obj).some(value => hasNonEmptyValue(value));
	return false;
}

$effect(() => {
	hasGraphicsData = hasNonEmptyValue(graphicsData);
});
</script>

{#if show}
	<div class="modal-overlay" role="button" tabindex="0" onclick={onCancel} onkeydown={(e) => e.key === 'Enter' && onCancel()} transition:fade={{ duration: 150 }}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>Confirm Your Submission</h2>
				<button class="close-btn" onclick={onCancel} aria-label="Close"><Icon icon="mdi:close" /></button>
			</div>
			<div class="modal-body">
				<p class="preview-text">Please review your submission. This is how it will appear on the game's page.</p>

				<PerformanceDetail performance={performanceData} />

				{#if hasGraphicsData}
					<GraphicsDetail settings={graphicsData} />
				{/if}
			</div>
			<div class="modal-footer">
				<button class="cancel-btn" onclick={onCancel}>Cancel</button>
				<button class="confirm-btn" onclick={onConfirm}>Confirm & Submit</button>
			</div>
		</div>
	</div>
{/if}


<style>
.modal-overlay {
position: fixed;
top: 0;
left: 0;
width: 100%;
height: 100%;
background-color: rgba(0, 0, 0, 0.7);
display: flex;
align-items: center;
justify-content: center;
z-index: 100;
}
.modal-content {
background-color: var(--background-color);
width: 90%;
max-width: 800px;
max-height: 90vh;
border-radius: var(--border-radius);
display: flex;
flex-direction: column;
box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}
.modal-header {
display: flex;
justify-content: space-between;
align-items: center;
padding: 1rem 1.5rem;
border-bottom: 1px solid var(--border-color);
}
.modal-header h2 {
margin: 0;
font-size: 1.5rem;
}
.close-btn {
background: none;
border: none;
cursor: pointer;
padding: 0.5rem;
color: var(--text-secondary);
}
.modal-body {
padding: 1.5rem;
overflow-y: auto;
flex-grow: 1;
}
.preview-text {
font-size: 0.9rem;
color: var(--text-secondary);
margin: 0 0 1.5rem 0;
text-align: center;
}
.modal-footer {
display: flex;
justify-content: flex-end;
gap: 1rem;
padding: 1rem 1.5rem;
border-top: 1px solid var(--border-color);
background-color: var(--surface-color);
}
.cancel-btn, .confirm-btn {
padding: 0.6rem 1.2rem;
border-radius: var(--border-radius);
border: none;
font-size: 1rem;
font-weight: 600;
cursor: pointer;
}
.cancel-btn {
background-color: var(--input-bg);
color: var(--text-primary);
border: 1px solid var(--border-color);
}
.confirm-btn {
background-color: var(--primary-color);
color: white;
}
</style>
