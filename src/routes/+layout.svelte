<script>
	import '../app.css'
    import Header from './Header.svelte';
    import Footer from './Footer.svelte';

	let { data, children } = $props()
</script>

<div class="layout-wrapper">
    <Header { data }/>

    <main class="app-container">
        {@render children?.()}
    </main>

    <Footer />
</div>

<style>
    .layout-wrapper {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
    }
	.app-container {
        flex-grow: 1;
        width: 100%;
        max-width: 1400px;
        margin: 0 auto;
    }
</style>