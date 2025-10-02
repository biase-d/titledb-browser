<script>
    import '../app.css'
    import Header from './Header.svelte';
    import Footer from './Footer.svelte';

	let { data, children } = $props()
</script>

<Header { data }/>

<main class="app-container">
    {@render children?.()}
</main>

<Footer />

<style>
    .app-container {
        width: 100%; 
        max-width: 1100px;
        margin: 0 auto;
    }
</style>
