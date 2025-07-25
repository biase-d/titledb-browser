import fs from 'fs/promises'
import path from 'path'

const MAIN_JSON_PATH = './main.json'
const DETAILS_DIR = './data/'
const OUTPUT_PATH = './static/full_index.json'

function parseSize (sizeStr) {
    if (!sizeStr || typeof sizeStr !== 'string') return 0
        const sizeMap = { KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3, TiB: 1024 ** 4 }
        const [value, unit] = sizeStr.split(' ')
        const floatValue = parseFloat(value)
        return floatValue * (sizeMap[unit] || 1)
}

async function buildRichIndex () {
    console.log('Starting index build...')

    try {
        const mainIndexContent = await fs.readFile(MAIN_JSON_PATH, 'utf-8')
        const mainIndex = JSON.parse(mainIndexContent)
        console.log(`Found ${Object.keys(mainIndex).length} titles in main.json.`)

        const richIndex = []
        let processedCount = 0

        for (const id in mainIndex) {
            const names = mainIndex[id]
            const detailPath = path.join(DETAILS_DIR, `${id}.json`)

            let details = {}
            try {
                const detailContent = await fs.readFile(detailPath, 'utf-8')
                details = JSON.parse(detailContent)
            } catch (e) {
                console.warn(`Warning: Could not read detail file for ${id}. Skipping.`)
                continue
            }

            richIndex.push({
                id,
                names,
                publisher: details.publisher || 'N/A',
                releaseDate: details.releaseDate || null,
                size: parseSize(details.size)
            })

            processedCount++
            if (processedCount % 1000 === 0) {
                console.log(`Processed ${processedCount} titles...`)
            }
        }

        await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
        await fs.writeFile(OUTPUT_PATH, JSON.stringify(richIndex, null, 2))

        console.log(`\nSuccessfully built index with ${richIndex.length} titles.`)
        console.log(`Output file written to: ${OUTPUT_PATH}`)
    } catch (error) {
        console.error('\nAn error occurred during the build process:')
        console.error(error)
    }
}

buildRichIndex()