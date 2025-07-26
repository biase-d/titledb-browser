import fs from 'fs/promises'
import path from 'path'
import postgres from 'postgres'

const dataRepoPath = path.resolve(process.cwd(), 'tmp/titledb_data')
const mainIndexPath = path.join(dataRepoPath, 'output/main.json')
const detailsDirPath = path.join(dataRepoPath, 'output/titleid')
const performanceRepoPath = path.resolve(process.cwd(), 'tmp/performance_data')
const performanceDataPath = path.join(performanceRepoPath, 'data')
const schemaPath = path.resolve(process.cwd(), 'scripts/schema.sql')

function parseSize (sizeStr) {
    if (!sizeStr) return null
        const sizeMap = { KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3 }
        const [value, unit] = (sizeStr || '').split(' ')
        const parsedValue = parseFloat(value)
        if (isNaN(parsedValue)) return null
            return Math.round(parsedValue * (sizeMap[unit] || 1))
}

async function syncDatabase() {
    console.log('Starting database synchronization process...')

    const connectionString = process.env.POSTGRES_URL;
    if (!connectionString) {
        console.error("ERROR: POSTGRES_URL environment variable not found.");
        process.exit(1);
    }
    const sql = postgres(connectionString, { ssl: 'require' });

    try {
        console.log("Checking database schema...");
        const tableExistsResult = await sql`
        SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'games');
        `;
        const tableExists = tableExistsResult[0].exists;

        if (!tableExists) {
            console.log("-> Table 'games' does not exist. Creating schema from scratch...");
            const schemaSql = await fs.readFile(schemaPath, 'utf-8');
            await sql.unsafe(schemaSql);
            console.log("-> Schema created successfully.");
        } else {
            console.log("-> Table 'games' exists. Verifying columns...");
            const columns = await sql`
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'games';
            `;
            const columnNames = columns.map(c => c.column_name);

            const requiredColumns = ['id', 'names', 'publisher', 'release_date', 'size_in_bytes', 'icon_url', 'banner_url', 'screenshots', 'performance', 'last_updated'];

            for (const col of requiredColumns) {
                if (!columnNames.includes(col)) {
                    console.warn(`--> Column '${col}' is missing. Attempting to add it...`);
                    if (col === 'screenshots') {
                        await sql`ALTER TABLE games ADD COLUMN screenshots TEXT[]`;
                        console.log(`---> Successfully added 'screenshots' column.`);
                    } else {
                        console.error(`---> Automatic migration for column '${col}' is not defined. Please update schema manually.`);
                    }
                }
            }
            console.log("-> Schema verification complete.");
        }

        console.log('Reading and merging data from local files...')
        const mainIndexContent = await fs.readFile(mainIndexPath, 'utf-8')
        const mainIndex = JSON.parse(mainIndexContent)
        const titleIds = Object.keys(mainIndex)

        const allGamesData = []
        for (const id of titleIds) {
            const detailPath = path.join(detailsDirPath, `${id}.json`)
            try {
                const detailContent = await fs.readFile(detailPath, 'utf-8')
                const details = JSON.parse(detailContent)

                let performanceData = null
                const perfFilePath = path.join(performanceDataPath, `${id}.json`)
                try {
                    const perfContent = await fs.readFile(perfFilePath, 'utf-8')
                    performanceData = JSON.parse(perfContent)
                } catch (e) { /* Expected */ }

                allGamesData.push({
                    id,
                    names: mainIndex[id],
                    publisher: details.publisher || null,
                    release_date: details.releaseDate || null,
                    size_in_bytes: parseSize(details.size),
                    icon_url: details.iconUrl || null,
                    banner_url: details.bannerUrl || null,
                    screenshots: details.screenshots || null,
                    performance: performanceData,
                })
            } catch (error) {
                if (error.code !== 'ENOENT') console.error(`Failed to process file for ID: ${id}`, error)
            }
        }
        console.log(`Successfully transformed data for ${allGamesData.length} games.`)

        const batchSize = 1000;
        console.log(`Upserting ${allGamesData.length} records in batches of ${batchSize}...`)
        for (let i = 0; i < allGamesData.length; i += batchSize) {
            const batch = allGamesData.slice(i, i + batchSize);
            process.stdout.write(`  -> Processing batch ${Math.floor(i / batchSize) + 1} / ${Math.ceil(allGamesData.length / batchSize)}... `);
            await sql`
            INSERT INTO games ${sql(batch, 'id', 'names', 'publisher', 'release_date', 'size_in_bytes', 'icon_url', 'banner_url', 'screenshots', 'performance')}
            ON CONFLICT (id) DO UPDATE SET
            names = EXCLUDED.names, publisher = EXCLUDED.publisher, release_date = EXCLUDED.release_date, size_in_bytes = EXCLUDED.size_in_bytes,
            icon_url = EXCLUDED.icon_url, banner_url = EXCLUDED.banner_url, screenshots = EXCLUDED.screenshots, 
            performance = EXCLUDED.performance, last_updated = NOW()
            `
            console.log('Done.');
        }
        console.log('-> Database synchronization completed successfully.')

    } catch (dbError) {
        console.error('An error occurred during the database operation:', dbError)
        process.exit(1)
    } finally {
        console.log('Closing database connection.')
        await sql.end()
    }

    console.log('\nDatabase sync process finished successfully!')
}

syncDatabase()
