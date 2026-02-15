<script>
	import { onMount, onDestroy, afterUpdate } from 'svelte'
	import { Chart } from 'chart.js'

	export let data
	export let options

	let canvasElement
	let chart

	function renderChart () {
	  if (!canvasElement) return

	  if (chart) {
	    chart.destroy()
	  }

	  chart = new Chart(canvasElement, {
	    type: 'line',
	    data: data,
	    options: options
	  })
	}

	onMount(() => {
	  renderChart()
	})

	afterUpdate(() => {
	  renderChart()
	})

	onDestroy(() => {
	  if (chart) {
	    chart.destroy()
	  }
	})
</script>

<canvas bind:this={canvasElement}></canvas>