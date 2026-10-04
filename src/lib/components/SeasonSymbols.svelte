<!-- The season drawings, hidden and defined once for every <use> that draws them.
     Mounted by each thing that uses them; a second copy is the same drawing -->
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
	<defs>
		<radialGradient id="pk-body" cx="38%" cy="32%" r="75%">
			<stop offset="0" stop-color="#ffa94d" />
			<stop offset="0.55" stop-color="#f47c1b" />
			<stop offset="1" stop-color="#b5480a" />
		</radialGradient>
		<symbol id="prop-pumpkin" viewBox="0 0 100 90">
			<ellipse cx="50" cy="84" rx="40" ry="5" fill="rgba(0,0,0,0.28)" />
			<ellipse cx="22" cy="52" rx="19" ry="29" fill="url(#pk-body)" />
			<ellipse cx="78" cy="52" rx="19" ry="29" fill="url(#pk-body)" />
			<ellipse cx="36" cy="52" rx="19" ry="31" fill="url(#pk-body)" />
			<ellipse cx="64" cy="52" rx="19" ry="31" fill="url(#pk-body)" />
			<ellipse cx="50" cy="52" rx="16" ry="32" fill="url(#pk-body)" />
			<path d="M46 22 C44 12 50 8 56 6 L58 12 C55 14 54 18 54 22 Z" fill="#4d7c2a" />
			<g class="face" fill="#ffe08a">
				<path d="M30 46 L42 52 L28 58 Z" />
				<path d="M70 46 L58 52 L72 58 Z" />
				<path d="M50 56 L45 64 L55 64 Z" />
				<path d="M30 68 Q50 80 70 68 L66 66 L61 71 L55 67 L50 72 L45 67 L39 71 L34 66 Z" />
			</g>
		</symbol>
		<symbol id="prop-pumpkin-small" viewBox="0 0 100 90"><use href="#prop-pumpkin" /></symbol>

		<symbol id="prop-leaves" viewBox="0 0 100 90">
			<ellipse cx="50" cy="84" rx="42" ry="5" fill="rgba(0,0,0,0.25)" />
			<path d="M8 82 C10 56 30 44 50 48 C72 44 92 58 94 82 Z" fill="#c2561a" />
			<path d="M16 82 C20 62 36 54 52 58 C70 56 84 64 88 82 Z" fill="#e0861f" />
			<path d="M28 82 C32 68 44 62 56 66 C68 64 76 70 80 82 Z" fill="#f0b43a" />
			<g class="leaf">
				<path d="M30 52 C24 40 34 30 46 32 C44 42 40 48 30 52 Z" fill="#b8321a" />
				<path d="M62 46 C58 32 70 24 82 28 C80 38 74 44 62 46 Z" fill="#e0861f" />
			</g>
			<ellipse cx="50" cy="58" rx="9" ry="11" fill="#8a5a2b" />
			<path d="M41 52 C42 44 58 44 59 52 Z" fill="#5c3a1a" />
			<rect x="49" y="42" width="2.5" height="5" rx="1" fill="#5c3a1a" />
		</symbol>
		<symbol id="prop-leaves-small" viewBox="0 0 100 90">
			<ellipse cx="50" cy="84" rx="38" ry="4" fill="rgba(0,0,0,0.2)" />
			<path d="M14 82 C18 62 34 54 50 58 C68 54 84 64 88 82 Z" fill="#e0861f" />
			<path d="M28 82 C32 70 44 64 56 68 C68 66 76 72 80 82 Z" fill="#f0b43a" />
		</symbol>

		<symbol id="prop-snowman" viewBox="0 0 100 90">
			<ellipse cx="50" cy="85" rx="34" ry="4" fill="rgba(0,0,0,0.22)" />
			<circle cx="50" cy="66" r="21" fill="#f4f8ff" />
			<circle cx="50" cy="38" r="15" fill="#fff" />
			<path d="M33 49 Q50 58 67 49 L66 55 Q50 63 34 55 Z" style="fill: var(--primary-color, #e21f26)" />
			<circle cx="45" cy="35" r="1.8" fill="#222" />
			<circle cx="55" cy="35" r="1.8" fill="#222" />
			<path d="M50 39 L62 42 L50 44 Z" fill="#f08a24" />
			<circle cx="50" cy="64" r="1.8" fill="#334" />
			<circle cx="50" cy="72" r="1.8" fill="#334" />
			<path d="M38 25 L62 25 L58 22 L58 12 L42 12 L42 22 Z" fill="#2a2f3a" />
			<rect x="38" y="23" width="24" height="3" fill="#2a2f3a" />
		</symbol>

		<symbol id="prop-candy" viewBox="0 0 100 90">
			<ellipse cx="50" cy="85" rx="30" ry="3.5" fill="rgba(0,0,0,0.25)" />
			<path d="M50 10 C60 10 80 70 82 82 Q50 90 18 82 C20 70 40 10 50 10 Z" fill="#ffd23f" />
			<path d="M50 10 C57 10 66 34 71 54 Q50 60 29 54 C34 34 43 10 50 10 Z" fill="#f77f1e" />
			<path d="M50 10 C54 10 58 20 61 31 Q50 35 39 31 C42 20 46 10 50 10 Z" fill="#fff8e7" />
		</symbol>
		<symbol id="prop-ghost" viewBox="0 0 100 90">
			<ellipse cx="50" cy="86" rx="24" ry="3" fill="rgba(0,0,0,0.2)" />
			<g class="bob">
				<path d="M20 78 L20 38 C20 18 34 8 50 8 C66 8 80 18 80 38 L80 78 L70 70 L60 78 L50 70 L40 78 L30 70 Z" fill="#f4f6ff" />
				<ellipse cx="38" cy="38" rx="5" ry="7" fill="#1b1d2b" />
				<ellipse cx="62" cy="38" rx="5" ry="7" fill="#1b1d2b" />
				<ellipse cx="50" cy="54" rx="5" ry="6" fill="#1b1d2b" />
			</g>
		</symbol>
		<symbol id="prop-bat" viewBox="0 0 100 90">
			<g class="bob">
				<path d="M50 40 C44 28 30 22 8 26 C16 34 14 44 24 48 C28 44 32 48 36 54 C42 50 46 52 50 60 C54 52 58 50 64 54 C68 48 72 44 76 48 C86 44 84 34 92 26 C70 22 56 28 50 40 Z" fill="#2a2038" />
				<circle cx="45" cy="38" r="1.6" fill="#ffd23f" />
				<circle cx="55" cy="38" r="1.6" fill="#ffd23f" />
			</g>
		</symbol>
		<symbol id="prop-acorn" viewBox="0 0 100 90">
			<ellipse cx="50" cy="85" rx="26" ry="3.5" fill="rgba(0,0,0,0.22)" />
			<path d="M24 46 C24 76 76 76 76 46 Z" fill="#b97a3b" />
			<path d="M18 48 C18 26 82 26 82 48 Z" fill="#6b4423" />
			<rect x="47" y="14" width="6" height="12" rx="2" fill="#4a2f17" />
		</symbol>
		<symbol id="prop-mushroom" viewBox="0 0 100 90">
			<ellipse cx="50" cy="85" rx="30" ry="3.5" fill="rgba(0,0,0,0.22)" />
			<path d="M38 82 L40 50 L60 50 L62 82 Q50 88 38 82 Z" fill="#f1e6d0" />
			<path d="M10 54 C10 20 90 20 90 54 C70 60 30 60 10 54 Z" fill="#c8301f" />
			<circle cx="30" cy="40" r="5" fill="#fff" /><circle cx="52" cy="32" r="6" fill="#fff" /><circle cx="72" cy="42" r="4.5" fill="#fff" />
		</symbol>
		<symbol id="prop-present" viewBox="0 0 100 90">
			<ellipse cx="50" cy="86" rx="34" ry="3.5" fill="rgba(0,0,0,0.22)" />
			<rect x="14" y="40" width="72" height="44" rx="3" fill="#2f6fd0" />
			<rect x="10" y="30" width="80" height="16" rx="3" fill="#3f84ee" />
			<rect x="44" y="30" width="12" height="54" style="fill: var(--primary-color, #e21f26)" />
			<path d="M50 30 C36 12 22 22 36 30 Z M50 30 C64 12 78 22 64 30 Z" style="fill: var(--primary-color, #e21f26)" />
		</symbol>
		<symbol id="prop-pine" viewBox="0 0 100 90">
			<ellipse cx="50" cy="86" rx="26" ry="3.5" fill="rgba(0,0,0,0.22)" />
			<rect x="45" y="70" width="10" height="14" fill="#6b4423" />
			<path d="M50 6 L78 44 L66 44 L88 72 L12 72 L34 44 L22 44 Z" fill="#1f6b46" />
			<path d="M50 6 L60 20 L50 17 L40 20 Z M38 38 L50 34 L62 38 L66 44 L34 44 Z M26 64 L50 58 L74 64 L88 72 L12 72 Z" fill="#f4f8ff" opacity="0.9" />
		</symbol>
		<symbol id="prop-mound" viewBox="0 0 100 90">
			<ellipse cx="50" cy="85" rx="40" ry="4" fill="rgba(0,0,0,0.18)" />
			<path d="M8 84 C14 56 34 46 52 50 C72 48 88 62 92 84 Z" fill="#f4f8ff" />
			<path d="M24 84 C28 68 42 62 56 66 C68 66 76 72 80 84 Z" fill="#fff" />
		</symbol>
	</defs>
</svg>
