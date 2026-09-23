import js from '@eslint/js'
import globals from 'globals'
import svelte from 'eslint-plugin-svelte'
import svelteParser from 'svelte-eslint-parser'
import tsParser from '@typescript-eslint/parser'

export default [
	{
		ignores: [
			'.svelte-kit/',
			'build/',
			'data/',
			'node_modules/',
			'src/lib/generated/'
		]
	},

	js.configs.recommended,

	// Svelte-specific rules. The previous config parsed .svelte files but never
	// enabled these, so component problems went unreported
	...svelte.configs['flat/recommended'],

	{
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			parser: tsParser,
			parserOptions: {
				extraFileExtensions: ['.svelte']
			},
			globals: {
				...globals.browser,
				...globals.node,
				// Svelte 5 runes
				$state: 'readonly',
				$derived: 'readonly',
				$effect: 'readonly',
				$props: 'readonly',
				$bindable: 'readonly',
				$inspect: 'readonly',
				$host: 'readonly'
			}
		},
		rules: {
			indent: 'off',
			'no-mixed-spaces-and-tabs': 'off',
			quotes: ['error', 'single', { avoidEscape: true }],
			semi: ['error', 'never'],
			'space-before-function-paren': ['error', 'always'],
			'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
			'no-undef': 'error',
			'no-case-declarations': 'off',

			// Fights defensive initialisation - `let x = []` before a try/catch
			// that assigns on every path is deliberate, not a mistake
			'no-useless-assignment': 'off',

			// Guards against breaking if kit.paths.base is ever set. It is not,
			// and wrapping ~70 hrefs in resolve() to satisfy a hypothetical is
			// not worth it. Turn this back on before adding a base path
			'svelte/no-navigation-without-resolve': 'off',

			// A real correctness backlog, not noise: unkeyed {#each} over a list
			// that reorders or filters lets Svelte reuse the wrong DOM nodes.
			// Warn so it stays visible while the ~56 call sites are worked
			// through, since each one needs a key chosen by hand
			'svelte/require-each-key': 'warn'
		}
	},

	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tsParser
			}
		},
		rules: {
			'no-inner-declarations': 'off',
			'no-self-assign': 'off'
		}
	}
]
