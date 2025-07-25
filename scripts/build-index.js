import fs from 'fs/promises'
import path from 'path'

const dataRepoPath = path.resolve(process.cwd(), 'tmp/titledb_data')
const mainIndexPath = path.join(dataRepoPath, 'main.json')
const detailsDirPath = path.join(dataRepoPath, 'output/titleid')

const staticDir = path.resolve(process.cwd(), 'static')
const outputFilePath = path.join(staticDir, 'full_index.json')

function parseSize (sizeStr) {
    if (!sizeStr) return 0
        const sizeMap = { KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3 }
        const [value, unit] = (sizeStr || '').split(' ')
        return parseFloat(value) * (sizeMap[unit] || 1)
}

async function buildRichIndex () {
    console.log('Starting rich index build from local files...')

    try {
        console.log(`Reading main index from: ${mainIndexPath}`)
        const mainIndexContent = await fs.readFile(mainIndexPath, 'utf-8')
        const mainIndex = JSON.parse(mainIndexContent)
        const titleIds = Object.keys(mainIndex)
        console.log(`Found ${titleIds.length} titles.`)

        console.log('Reading details for all titles...')
        const results = []

        for (const id of titleIds) {
            const detailPath = path.join(detailsDirPath, `${id}.json`)
            try {
                const detailContent = await fs.readFile(detailPath, 'utf-8')
                const details = JSON.parse(detailContent)

                results.push({
                    id,
                    names: mainIndex[id],
                    publisher: details.publisher || 'N/A',
                    releaseDate: details.releaseDate || null,
                    sizeInBytes: parseSize(details.size)
                })
            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.warn(`File not found for ID: ${id}. Skipping.`)
                } else {
                    console.error(`Failed to process file for ID: ${id}`, error)
                }
            }
        }

        console.log(`Successfully processed details for ${results.length} titles.`)
        console.log(`Missed ${titleIds.length - results.length} titles.`)

        await fs.writeFile(outputFilePath, JSON.stringify(results))
        console.log(`Rich index successfully built at: ${outputFilePath}`)
    } catch (error) {
        console.error('An error occurred during the build process:', error)
        process.exit(1)
    }
}

buildRichIndex()