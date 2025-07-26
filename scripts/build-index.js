import fs from 'fs/promises'
import path from 'path'
import postgres from 'postgres'

const dataRepoPath = path.resolve(process.cwd(), 'tmp/titledb_data')
const mainIndexPath = path.join(dataRepoPath, 'output/main.json')
const detailsDirPath = path.join(dataRepoPath, 'output/titleid')
const performanceRepoPath = path.resolve(process.cwd(), 'tmp/performance_data')
const performanceDataPath = path.join(performanceRepoPath, 'data')
const schemaPath = path.resolve(process.cwd(), 'scripts/schema.sql')

function parseSize(sizeStr) {
    if (!sizeStr) return null
        const sizeMap = { KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3 }
        const [value, unit] = (sizeStr || '').split(' ')
        const parsedValue = parseFloat(value)
        if (isNaN(parsedValue)) return null
            return Math.round(parsedValue * (sizeMap[unit] || 1))
}

function dataChanged(existing, incoming) {
    if (!existing) return true; // It's a new entry

    for (const key of Object.keys(incoming)) {
        if (key === 'last_updated') continue;
        const a = existing[key];
        const b = incoming[key];

        if (key === 'performance') {
            if (JSON.stringify(a) !== JSON.stringify(b)) return true;
        } else {
            if (JSON.stringify(a) !== JSON.stringify(b)) return true;
        }
    }
    return false;
}

async function syncDatabase() {
    console.log('Starting database synchronization process...')
    const connectionString = process.env.POSTGRES_URL
    if (!connectionString) {
        console.error('POSTGRES_URL missing')
        process.exit(1)
    }
    const sql = postgres(connectionString, { ssl: 'require' })

    try {
        const tableExists = await sql`
        SELECT EXISTS (
            SELECT FROM pg_tables
            WHERE schemaname = 'public' AND tablename = 'games'
        );
        `
        if (!tableExists[0].exists) {
            const schemaSql = await fs.readFile(schemaPath, 'utf-8')
            await sql.unsafe(schemaSql.replace('DROP TABLE IF EXISTS games;', ''))
        }

        const mainIndex = JSON.parse(await fs.readFile(mainIndexPath, 'utf-8'))
        const titleIds = Object.keys(mainIndex)

        const allGamesData = []
        for (const id of titleIds) {
            try {
                const details = JSON.parse(await fs.readFile(path.join(detailsDirPath, `${id}.json`), 'utf-8'))
                let performanceData = null
                try {
                    performanceData = JSON.parse(await fs.readFile(path.join(performanceDataPath, `${id}.json`), 'utf-8'))
                } catch {}
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
            } catch {}
        }
        console.log(`Prepared ${allGamesData.length} game entries.`)

        console.log('Loading existing DB entries...')
        const existingGames = await sql`SELECT * FROM games`
        const existingMap = new Map(existingGames.map(g => [g.id, g]))

        const updates = allGamesData.filter(game => dataChanged(existingMap.get(game.id), game))
        console.log(`Found ${updates.length} new or updated entries.`)

        const batchSize = 500
        for (let i = 0; i < updates.length; i += batchSize) {
            const batch = updates.slice(i, i + batchSize)
            await sql`
            INSERT INTO games ${sql(batch,
                'id', 'names', 'publisher', 'release_date',
                'size_in_bytes', 'icon_url', 'banner_url',
                'performance', 'screenshots'
            )}
            ON CONFLICT (id) DO UPDATE SET
            names = EXCLUDED.names,
            publisher = EXCLUDED.publisher,
            release_date = EXCLUDED.release_date,
            size_in_bytes = EXCLUDED.size_in_bytes,
            icon_url = EXCLUDED.icon_url,
            banner_url = EXCLUDED.banner_url,
            screenshots = EXCLUDED.screenshots,
            performance = EXCLUDED.performance,
            last_updated = NOW()
            `
            console.log(`Batch ${Math.floor(i / batchSize) + 1} committed.`)
        }
        console.log('Sync complete.')

    } catch (error) {
        console.error('Sync failed:', error)
        process.exit(1)
    } finally {
        await sql.end()
    }
}

syncDatabase()
