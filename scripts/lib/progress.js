/**
 * @file Progress Reporter
 * @description Structured logging and progress tracking for build pipeline
 */

const BOX = {
    topLeft: '╔', topRight: '╗', bottomLeft: '╚', bottomRight: '╝',
    horizontal: '═', vertical: '║', leftT: '╠', rightT: '╣'
}

/**
 * Create a progress tracker for a build phase
 * @param {string} label - Phase label
 * @param {number} [total] - Total items (if known)
 * @returns {{ update: (current: number) => void, finish: () => void }}
 */
export function createPhaseTracker(label, total) {
    const start = Date.now()
    let lastLoggedPercent = -1

    return {
        update(current) {
            if (total) {
                const percent = Math.floor((current / total) * 100)
                // Only log at 10% intervals to avoid spam
                if (percent >= lastLoggedPercent + 10) {
                    lastLoggedPercent = percent
                    console.log(`  [${label}] ${current}/${total} (${percent}%)`)
                }
            }
        },
        finish() {
            const elapsed = ((Date.now() - start) / 1000).toFixed(1)
            console.log(`  [${label}] Done in ${elapsed}s`)
            return parseFloat(elapsed)
        }
    }
}

/**
 * Print a formatted build summary
 * @param {Object} stats
 * @param {string} stats.mode - 'Full Rebuild' or 'Incremental'
 * @param {number} stats.games - Games upserted
 * @param {number} stats.profiles - Profiles upserted
 * @param {number} stats.graphics - Graphics upserted
 * @param {number} stats.videos - Videos upserted
 * @param {string} [stats.schemaSwap] - e.g. 'layer_a → layer_b'
 * @param {number} stats.duration - Total seconds
 */
export function printBuildSummary(stats) {
    const width = 40
    const hr = BOX.horizontal.repeat(width)
    const pad = (str) => {
        const padded = ` ${str}`
        return padded + ' '.repeat(Math.max(0, width - padded.length))
    }

    console.log('')
    console.log(`${BOX.topLeft}${hr}${BOX.topRight}`)
    console.log(`${BOX.vertical}${pad('Database Build Complete')}${BOX.vertical}`)
    console.log(`${BOX.leftT}${hr}${BOX.rightT}`)
    console.log(`${BOX.vertical}${pad(`Mode:     ${stats.mode}`)}${BOX.vertical}`)
    console.log(`${BOX.vertical}${pad(`Games:    ${stats.games.toLocaleString()} upserted`)}${BOX.vertical}`)
    console.log(`${BOX.vertical}${pad(`Profiles: ${stats.profiles.toLocaleString()} upserted`)}${BOX.vertical}`)
    console.log(`${BOX.vertical}${pad(`Graphics: ${stats.graphics.toLocaleString()} upserted`)}${BOX.vertical}`)
    console.log(`${BOX.vertical}${pad(`Videos:   ${stats.videos.toLocaleString()} upserted`)}${BOX.vertical}`)
    if (stats.schemaSwap) {
        console.log(`${BOX.vertical}${pad(`Schema:   ${stats.schemaSwap}`)}${BOX.vertical}`)
    }
    console.log(`${BOX.vertical}${pad(`Duration: ${stats.duration.toFixed(1)}s`)}${BOX.vertical}`)
    console.log(`${BOX.bottomLeft}${hr}${BOX.bottomRight}`)
    console.log('')
}
