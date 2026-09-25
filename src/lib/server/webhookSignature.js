/**
 * @file Webhook Signature
 * @description Verifies the HMAC signature GitHub sends with a webhook
 */

import crypto from 'node:crypto'

/**
 * Check `X-Hub-Signature-256` against the body
 *
 * The comparison is timing-safe. A plain `===` leaks, through how long it takes
 * to fail, how much of a guessed signature was correct, which is enough to
 * recover a valid one a byte at a time
 *
 * @param {string} body - The raw request body, exactly as received. Re-serialising
 *   parsed JSON changes the bytes and the signature will never match
 * @param {string|null} header - The `X-Hub-Signature-256` header
 * @param {string} secret - The shared secret configured on both ends
 * @returns {boolean}
 */
export function verifyGitHubSignature (body, header, secret) {
	if (!header || !secret) return false

	const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex')

	const a = Buffer.from(header)
	const b = Buffer.from(expected)

	// timingSafeEqual throws on a length mismatch, which would itself leak
	if (a.length !== b.length) return false

	return crypto.timingSafeEqual(a, b)
}
