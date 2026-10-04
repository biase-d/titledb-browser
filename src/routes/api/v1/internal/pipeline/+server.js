import { json } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'
import { verifyGitHubSignature } from '$lib/server/webhookSignature'
import { startPipeline } from '$lib/server/pipelineRunner'
import logger from '$lib/services/loggerService'

/**
 * Starts a sync when the data repository changes
 *
 * This used to be a GitHub Actions workflow, which cloned both repositories
 * onto a runner and then wrote every row to the database across the internet.
 * On the server the same work is a local clone and a local socket
 *
 * Point a webhook at this from the nx-performance repository: content type
 * application/json, the secret below, and the push event
 */

/** Only a change to the data branch is worth a sync */
const DATA_BRANCHES = new Set(['refs/heads/main', 'refs/heads/master', 'refs/heads/v3'])

/** @type {import('./$types').RequestHandler} */
export async function POST ({ request }) {
	const secret = env.PIPELINE_WEBHOOK_SECRET || env.INTERNAL_WEBHOOK_SECRET

	if (!secret) {
		logger.error(
			'Pipeline webhook called but no secret is configured',
			new Error('Set PIPELINE_WEBHOOK_SECRET')
		)
		return json({ error: 'Server configuration error' }, { status: 500 })
	}

	// The raw bytes: the signature covers what was sent, and re-serialising
	// parsed JSON produces different bytes
	const body = await request.text()
	const signature = request.headers.get('x-hub-signature-256')

	if (!verifyGitHubSignature(body, signature, secret)) {
		logger.warn('Pipeline webhook rejected: bad signature')
		return json({ error: 'Invalid signature' }, { status: 401 })
	}

	const event = request.headers.get('x-github-event')

	// GitHub sends this when the webhook is first saved, to prove it is wired up
	if (event === 'ping') return json({ ok: true, pong: true })

	/** @type {any} */
	let payload = {}
	try {
		payload = JSON.parse(body)
	} catch {
		return json({ error: 'Body is not JSON' }, { status: 400 })
	}

	// A push to a side branch, or a tag, is not new data
	if (event === 'push' && payload.ref && !DATA_BRANCHES.has(payload.ref)) {
		return json({ started: false, reason: `ignoring ${payload.ref}` })
	}

	const result = await startPipeline({
		fullRebuild: payload.full_rebuild === true,
		reason: `webhook:${event ?? 'unknown'}`
	})

	// 202: accepted and running. Not 200 with a result - a sync takes minutes
	// and GitHub times a webhook out after ten seconds
	return json(result, { status: result.started ? 202 : 200 })
}
