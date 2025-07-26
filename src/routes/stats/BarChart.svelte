<script>
	import { onMount, onDestroy, afterUpdate, createEventDispatcher } from 'svelte';
	import { Chart } from 'chart.js';

	export let data;
	export let options;

	const dispatch = createEventDispatcher();

	let canvasElement;
	let chart;

	function renderChart() {
		if (!canvasElement) return;
		if (chart) chart.destroy();

		chart = new Chart(canvasElement, {
			type: 'bar',
			data: data,
			options: options
		});
	}

	onMount(() => {
		renderChart();
	});

	afterUpdate(() => {
		renderChart();
	});

	onDestroy(() => {
		if (chart) {
			chart.destroy();
		}
	});
</script>

<canvas
	bind:this={canvasElement}
	on:click={(event) => dispatch('chartClick', { event, chart })}
></canvas>