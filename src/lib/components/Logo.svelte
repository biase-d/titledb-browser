<script>
	/**
	 * The site's mark: a Switch game card, front on, with the red band. Drawn from
	 * the real card's proportions (21 x 31 mm, the label window and band measured
	 * from a photograph), the same drawing as static/logo.svg and the favicon
	 *
	 * @type {{ size?: string, band?: string, title?: string }}
	 */
	let { size = '2rem', band = '#e4202f', title = undefined } = $props()
</script>

<svg class="logo-mark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 42 62" style="height: {size}" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined} aria-label={title}>
  <defs>
    <linearGradient id="spl-shell" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2a2a30"/>
      <stop offset="0.45" stop-color="#17171b"/>
      <stop offset="1" stop-color="#0c0c0f"/>
    </linearGradient>
    <linearGradient id="spl-band" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color={band}/>
      <stop offset="1" stop-color="#b8101d"/>
    </linearGradient>
    <clipPath id="spl-label"><rect x="3.65" y="5.21" width="34.69" height="49.18" rx="0.67"/></clipPath>
  </defs>
  <rect width="42" height="62" rx="2.74" fill="url(#spl-shell)"/>
  <rect x="0.5" y="0.5" width="41" height="61" rx="2.24" fill="none" stroke="#fff" stroke-opacity="0.09"/>
  <rect x="3.25" y="4.81" width="35.49" height="49.98" rx="0.84" fill="#050506"/>
  <g clip-path="url(#spl-label)">
    <rect x="3.65" y="5.21" width="34.69" height="49.18" fill="#f4f4f2"/>
    <rect x="3.65" y="5.21" width="34.69" height="11.93" fill="url(#spl-band)"/>
    <rect x="10.59" y="9.26" width="20.82" height="1.6" rx="0.8" fill="#fff" fill-opacity="0.9"/>
    <rect x="14.06" y="12.60" width="13.88" height="1.1" rx="0.55" fill="#fff" fill-opacity="0.55"/>
    <circle cx="21.00" cy="32.78" r="8.33" fill="#d3d3dc"/>
    <rect x="8.51" y="47.19" width="24.98" height="1.5" rx="0.75" fill="#2a2c33" fill-opacity="0.75"/>
    <rect x="8.51" y="49.99" width="14.57" height="1.1" rx="0.55" fill="#2a2c33" fill-opacity="0.4"/>
  </g>
  <path d="M17.60 57.16 H24.40 L21.00 60.27 Z" fill="#fff" fill-opacity="0.2"/>
</svg>

<style>
	.logo-mark {
		display: block;
		width: auto;
		flex: none;
	}
</style>
