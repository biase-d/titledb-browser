// scripts/swap-layers.js
import 'dotenv/config';
import postgres from 'postgres';
import { getActiveSchema, getStandbySchema, swapSchemas } from '../src/lib/pipeline/schema-manager.js';

async function run() {
    process.env.IS_PIPELINE = 'true';
    const sql = postgres(process.env.POSTGRES_URL, { max: 1 });
    try {
        const current = await getActiveSchema(sql);
        const target = await getStandbySchema(sql);

        console.log(`Current active layer: ${current}`);
        console.log(`Target layer to activate: ${target}`);

        // This atomically swaps the 'active_schema' entry in public.schema_state
        // AND refreshes all 'active_*' views in the public schema.
        await swapSchemas(sql, target);
        
        console.log('\nSwap successful! The application is now serving data from the new layer.');
    } catch (err) {
        console.error('\nSwap failed:', err.message);
    } finally {
        await sql.end();
    }
}

run();
