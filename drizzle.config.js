import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    dialect: 'postgresql',
    schema: './src/lib/db/schema.js',
    out: './drizzle',
    dbCredentials: {
        url: process.env.POSTGRES_URL,
    },
    verbose: true,
    strict: true,
});