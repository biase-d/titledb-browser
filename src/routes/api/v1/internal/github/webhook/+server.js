import { json } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'
import * as contributionRepo from '$lib/repositories/contributionRepository'

/**
 * @file GitHub Webhook Handler
 * @description Internal API to handle GitHub PR merge events and update DB status
 *
 * Target: /api/v1/internal/github/webhook
 */

export async function POST({ request, locals }) {
	const signature = request.headers.get('x-hub-signature-256')
	if (!signature) {
		return json({ error: 'Missing signature' }, { status: 401 })
	}

	const secret = env.INTERNAL_WEBHOOK_SECRET
	if (!secret) {
		console.error('INTERNAL_WEBHOOK_SECRET is not defined in environment variables')
		return json({ error: 'Server configuration error' }, { status: 500 })
	}

	const body = await request.text()
	const hmac = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	)
	const signatureBuffer = new TextEncoder().encode(body)
	const signedBuffer = await crypto.subtle.sign('HMAC', hmac, signatureBuffer)
	const signedHex = Array.from(new Uint8Array(signedBuffer))
		.map(b => b.toString(16).padStart(2, '0'))
		.join('')

	const expectedSignature = `sha256=${signedHex}`

	if (signature !== expectedSignature) {
		console.error('Webhook signature mismatch')
		return json({ error: 'Invalid signature' }, { status: 401 })
	}

	const payload = JSON.parse(body)

	if (payload.action === 'closed') {
		const prNumber = payload.pull_request.number
		const isMerged = !!payload.pull_request.merged

		try {
			if (isMerged) {
				await contributionRepo.approveContribution(locals.db, prNumber)
				return json({ success: true, message: `Contribution PR #${prNumber} approved and live.` })
			} else {
				await contributionRepo.rejectContribution(locals.db, prNumber)
				return json({ success: true, message: `Contribution PR #${prNumber} rejected and cleaned up.` })
			}
		} catch (err) {
			console.error('Webhook error:', err)
			return json({ error: 'Failed to update database' }, { status: 500 })
		}
	}

	return json({ message: 'Event ignored' })
}
