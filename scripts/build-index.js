import fs from 'fs/promises'
import path from 'path'
import { mainUrl, titleIdUrl} from '../src/lib/index.js'

const staticDir = path.resolve(process.cwd(), 'static')
const outputFilePath = path.join(staticDir, 'full_index.json')

function parseSize (sizeStr) {
    if (!sizeStr) return 0
        const sizeMap = { KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3 }
        const [value, unit] = (sizeStr || '').split(' ')
        return parseFloat(value) * (sizeMap[unit] || 1)
}

async function buildRichIndex () {
    console.log('Starting rich index build...')
    console.log('NOTE: This will fetch thousands of files and may take several minutes.')

    try {
        console.log(`Fetching main index from ${mainUrl}`)
        const mainIndexRes = await fetch(mainUrl)
        if (!mainIndexRes.ok) throw new Error(`Failed to fetch main index: ${mainIndexRes.statusText}`)
            const mainIndex = await mainIndexRes.json()
            const titleIds = Object.keys(mainIndex)
            console.log(`Found ${titleIds.length} titles.`)

            console.log('Fetching details for all titles...')
            const promises = titleIds.map(async (id) => {
                try {
                    const detailRes = await fetch(`${titleIdUrl(id)}`)
                    if (!detailRes.ok) {
                        console.warn(`Could not fetch details for ${id}. Skipping.`)
                        return null
                    }
                    const details = await detailRes.json()
                    return {
                        id,
                        names: mainIndex[id],
                        publisher: details.publisher || 'N/A',
                        releaseDate: details.releaseDate || null,
                        sizeInBytes: parseSize(details.size)
                    }
                } catch (e) {
                    return null
                }
            })

            const results = await Promise.all(promises)
            const validResults = results.filter(Boolean)

            console.log(`Successfully fetched details for ${validResults.length} titles.`)

            await fs.writeFile(outputFilePath, JSON.stringify(validResults))
            console.log(`Rich index successfully built at: ${outputFilePath}`)
    } catch (error) {
        console.error('An error occurred during the build process:', error)
        process.exit(1)
    }
}

buildRichIndex()