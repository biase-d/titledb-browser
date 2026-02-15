/**
 * Simple utility to detect if the current user agent is a bot/crawler.
 * This can be used to skip interactive elements like onboarding for SEO crawlers.
 * 
 * @returns {boolean}
 */
export function isBot() {
    if (typeof navigator === 'undefined') return false

    const botPatterns = [
        'googlebot',
        'bingbot',
        'yandexbot',
        'duckduckbot',
        'slurp',
        'baiduspider',
        'ia_archiver',
        'discordbot',
        'twitterbot',
        'facebookexternalhit',
        'telegrambot',
        'slackbot',
        'lighthouse'
    ]

    const ua = navigator.userAgent.toLowerCase()
    return botPatterns.some(pattern => ua.includes(pattern))
}
