/**
 * @file Build Status
 * @description Manages the build_status table during builds for frontend awareness
 */

/**
 * Set the build as in-progress
 * @param {import('postgres').Sql} sqlClient
 * @param {string} phase - Current build phase
 */
export async function setBuildStarted(sqlClient, phase = 'starting') {
    await sqlClient.unsafe(`
		UPDATE public.build_status
		SET is_building = TRUE, phase = '${phase}', started_at = now(), completed_at = NULL
		WHERE id = 1
	`)
}

/**
 * Update the current build phase
 * @param {import('postgres').Sql} sqlClient
 * @param {string} phase
 */
export async function setBuildPhase(sqlClient, phase) {
    await sqlClient.unsafe(`
		UPDATE public.build_status
		SET phase = '${phase}'
		WHERE id = 1
	`)
}

/**
 * Mark the build as complete
 * @param {import('postgres').Sql} sqlClient
 */
export async function setBuildComplete(sqlClient) {
    await sqlClient.unsafe(`
		UPDATE public.build_status
		SET is_building = FALSE, phase = 'complete', completed_at = now()
		WHERE id = 1
	`)
}
