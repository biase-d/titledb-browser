// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	/* eslint-disable no-unused-vars */
	namespace App {
		// interface Error {}
		interface Locals {
			db: import('drizzle-orm/neon-http').NeonHttpDatabase<typeof import('$lib/db/schema') > | import('drizzle-orm/postgres-js').PostgresJsDatabase<typeof import('$lib/db/schema') >;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export { }
