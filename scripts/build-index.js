import fs from 'fs/promises'
import path from 'path'

const dataRepoPath = path.resolve(process.cwd(), 'tmp/titledb_data')
const mainIndexPath = path.join(dataRepoPath, 'output/main.json')
const detailsDirPath = path.join(dataRepoPath, 'output/titleid')

const staticDir = path.resolve(process.cwd(), 'static')
const fullIndexOutputPath = path.join(staticDir, 'full_index.json')
const namesDir = path.join(staticDir, 'names')
const publishersDir = path.join(staticDir, 'publishers')
const metadataPath = path.join(staticDir, 'metadata.json')

function parseSize (sizeStr) {
    if (!sizeStr) return 0
        const sizeMap = { KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3 }
        const [value, unit] = (sizeStr || '').split(' ')
        return parseFloat(value) * (sizeMap[unit] || 1)
}

async function buildRichIndex () {
    console.log('Starting unified index build from local files...')

    try {
        console.log(`Reading main index from: ${mainIndexPath}`)
        const mainIndexContent = await fs.readFile(mainIndexPath, 'utf-8')
        const mainIndex = JSON.parse(mainIndexContent)
        const titleIds = Object.keys(mainIndex)
        console.log(`Found ${titleIds.length} titles.`)

        console.log('Reading and processing all title details...')
        const allRichData = []
        for (const id of titleIds) {
            const detailPath = path.join(detailsDirPath, `${id}.json`)
            try {
                const detailContent = await fs.readFile(detailPath, 'utf-8')
                const details = JSON.parse(detailContent)

                allRichData.push({
                    id,
                    names: mainIndex[id],
                    publisher: details.publisher || 'N/A',
                    releaseDate: details.releaseDate || null,
                    sizeInBytes: parseSize(details.size)
                })
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    console.error(`Failed to process file for ID: ${id}`, error)
                }
            }
        }
        console.log(`Successfully processed details for ${allRichData.length} titles.`)


        await fs.mkdir(namesDir, { recursive: true })
        await fs.mkdir(publishersDir, { recursive: true })

        await fs.writeFile(fullIndexOutputPath, JSON.stringify(allRichData))
        console.log(`Rich index successfully built at: ${fullIndexOutputPath}`)

        for (const id of titleIds) {
            if (mainIndex[id]) {
                const nameFilePath = path.join(namesDir, `${id}.json`)
                await fs.writeFile(nameFilePath, JSON.stringify({ names: mainIndex[id] }))
            }
        }
        console.log(`Generated ${titleIds.length} name files.`)

        const publishersMap = new Map()
        const yearsSet = new Set()

        for (const item of allRichData) {
            if (item.publisher && item.publisher !== 'N/A') {
                if (!publishersMap.has(item.publisher)) {
                    publishersMap.set(item.publisher, [])
                }
                publishersMap.get(item.publisher).push(item)
            }
            if (item.releaseDate) {
                yearsSet.add(item.releaseDate.toString().substring(0, 4))
            }
        }

        for (const [publisher, items] of publishersMap.entries()) {
            const fileName = publisher.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json'
            const publisherFilePath = path.join(publishersDir, fileName)
            await fs.writeFile(publisherFilePath, JSON.stringify(items))
        }
        console.log(`Generated ${publishersMap.size} publisher-specific index files.`)

        const metadata = {
            publishers: [...publishersMap.keys()].sort(),
            years: [...yearsSet].sort((a, b) => b - a)
        }
        await fs.writeFile(metadataPath, JSON.stringify(metadata))
        console.log(`Metadata file generated at: ${metadataPath}`)

    } catch (error) {
        console.error('An error occurred during the build process:', error)
        process.exit(1)
    }
}

buildRichIndex()