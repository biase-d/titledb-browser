import { describe, it, expect } from 'vitest'
import { isBot } from '../src/lib/utils/bot.js'

/**
 * The onboarding modal is skipped for crawlers. A miss means Google judges the
 * page with a modal over the content, and the URL inspection tool shows that
 * instead of the page
 */
describe('isBot', () => {
	const crawlers = {
		Googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
		'Googlebot Smartphone': 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
		'Google-InspectionTool': 'Mozilla/5.0 (compatible; Google-InspectionTool/1.0;)',
		GoogleOther: 'Mozilla/5.0 (compatible; GoogleOther)',
		Bingbot: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
		Applebot: 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)',
		Discordbot: 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
		Twitterbot: 'Twitterbot/1.0',
		Slackbot: 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
		Lighthouse: 'Mozilla/5.0 Chrome-Lighthouse',
		Headless: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/120.0.0.0 Safari/537.36'
	}

	for (const [name, ua] of Object.entries(crawlers)) {
		it(`detects ${name}`, () => expect(isBot(ua)).toBe(true))
	}

	const people = {
		Chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
		Safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
		Firefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0',
		'iPhone Safari': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
		// A phone whose name ends in "bot", which a bare `includes('bot')` would
		// have mistaken for a crawler and denied onboarding to
		'Cubot phone': 'Mozilla/5.0 (Linux; Android 11; CUBOT NOTE 20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0 Mobile Safari/537.36'
	}

	for (const [name, ua] of Object.entries(people)) {
		it(`leaves ${name} alone`, () => expect(isBot(ua)).toBe(false))
	}

	it('says no when there is no user agent to read', () => {
		expect(isBot('')).toBe(false)
	})
})
