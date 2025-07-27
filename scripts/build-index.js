import fs from 'fs/promises';
import path from 'path';
import postgres from 'postgres';
import { simpleGit } from 'simple-git';
import { schema } from './schema.js';

const dataRepoPath = path.resolve(process.cwd(), 'tmp/titledb_data')
const mainIndexPath = path.join(dataRepoPath, 'output/main.json')
const detailsDirPath = path.join(dataRepoPath, 'output/titleid')
const performanceRepoPath = path.resolve(process.cwd(), 'tmp/performance_data')
const performanceDataPath = path.join(performanceRepoPath, 'data')

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

    const git = simpleGit(performanceRepoPath);

    const connectionString = process.env.POSTGRES_URL;
    if (!connectionString) {
        console.error("ERROR: POSTGRES_URL environment variable not found.");
        process.exit(1);
    }
    const sql = postgres(connectionString, { ssl: 'require' });

    try {
        console.log("Verifying database schema...");
        const tableExistsResult = await sql`SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = ${schema.tableName});`;

        if (!tableExistsResult[0].exists) {
            console.log(`-> Table '${schema.tableName}' does not exist. Creating from scratch...`);
            for (const extQuery of schema.extensions) {
                await sql.unsafe(extQuery);
            }
            const columnDefs = schema.columns.map(c => `"${c.name}" ${c.type} ${c.constraints || ''}`).join(', ');
            await sql.unsafe(`CREATE TABLE ${schema.tableName} (${columnDefs})`);
            console.log("-> Table created. Applying indexes...");
            for (const indexQuery of schema.indexes) {
                await sql.unsafe(indexQuery);
            }
            console.log("-> Schema creation complete.");
        } else {
            console.log(`-> Table '${schema.tableName}' exists. Verifying columns...`);
            for (const extQuery of schema.extensions) {
                await sql.unsafe(extQuery);
            }
            const columnsResult = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = ${schema.tableName};`;
            const existingColumns = new Set(columnsResult.map(c => c.column_name));
            
            for (const column of schema.columns) {
                if (!existingColumns.has(column.name)) {
                    console.warn(`--> Column '${column.name}' is missing. Attempting to add it...`);
                    await sql.unsafe(`ALTER TABLE ${schema.tableName} ADD COLUMN "${column.name}" ${column.type} ${column.constraints || ''}`);
                    console.log(`---> Successfully added '${column.name}' column.`);
                }
            }
            console.log("-> Schema verification complete.");
        }

        console.log('Extracting contributor information from Git history...');
        const contributorMap = new Map();
        try {
            const dataFiles = await fs.readdir(performanceDataPath);
            for (const file of dataFiles) {
                if (file.endsWith('.json')) {
                    const titleId = file.replace('.json', '');
                    try {
                        const log = await git.log({
                            file: path.join('data', file),
                            maxCount: 1,
                            format: { authorEmail: '%ae' }
                        });

                        if (log.latest?.authorEmail) {
                            const match = log.latest.authorEmail.match(/\+(.+)@users\.noreply\.github\.com$/);
                            if (match && match[1]) {
                                contributorMap.set(titleId, match[1]);
                            }
                        }
                    } catch (e) {}
                }
            }
        } catch (e) {
            console.warn("Could not read performance data directory. Contributor info will be missing.");
        }
        console.log(`-> Found contributor info for ${contributorMap.size} files.`);

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
                    contributor: contributorMap.get(id) || null
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
            INSERT INTO games ${sql(batch, 'id', 'names', 'publisher', 'release_date', 'size_in_bytes', 'icon_url', 'banner_url', 'screenshots', 'performance', 'contributor')}
            ON CONFLICT (id) DO UPDATE SET
            names = EXCLUDED.names, publisher = EXCLUDED.publisher, release_date = EXCLUDED.release_date, size_in_bytes = EXCLUDED.size_in_bytes,
            icon_url = EXCLUDED.icon_url, banner_url = EXCLUDED.banner_url, screenshots = EXCLUDED.screenshots, 
            performance = EXCLUDED.performance, contributor = EXCLUDED.contributor, last_updated = NOW()
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
