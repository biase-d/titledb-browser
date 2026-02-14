/**
 * @file Contribution Strategies
 * @description Strategy pattern for different contribution flows
 */

import * as githubRepo from '$lib/repositories/githubRepository';
import * as gameRepo from '$lib/repositories/gameRepository';
import { db } from '$lib/db'; // Assuming a default db export exists or is needed
import { performanceProfiles, graphicsSettings, youtubeLinks } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Base Strategy Class
 */
class ContributionStrategy {
    /**
     * @param {Object} details 
     * @param {Object} user 
     * @param {any} dbConnection
     * @returns {Promise<{success: boolean, url?: string, number?: number, error?: string}>}
     */
    async submit(details, user, dbConnection) {
        throw new Error('Method not implemented');
    }
}

/**
 * Legacy/Current behavior: Only creates a Pull Request on GitHub
 */
export class GitHubOnlyStrategy extends ContributionStrategy {
    async submit(details, user, dbConnection) {
        const branchName = `contrib/${user.login}/${details.groupId}-${Date.now()}`;

        const prDetails = await githubRepo.createPullRequest({
            branchName,
            commitMessage: details.commitMessage,
            prTitle: details.prTitle,
            prBody: details.prBody,
            files: details.files
        });

        if (!prDetails) {
            return { success: false, error: 'Failed to create GitHub PR' };
        }

        return { success: true, url: prDetails.url, number: prDetails.number };
    }
}

/**
 * New behavior: Inserts into DB as 'pending' and then creates a GitHub PR
 */
export class DatabaseAndGitHubStrategy extends ContributionStrategy {
    async submit(details, user, dbConnection) {
        const branchName = `contrib-beta/${user.login}/${details.groupId}-${Date.now()}`;

        const prDetails = await githubRepo.createPullRequest({
            branchName,
            commitMessage: details.commitMessage,
            prTitle: details.prTitle,
            prBody: details.prBody,
            files: details.files
        });

        if (!prDetails) {
            return { success: false, error: 'Failed to create GitHub PR' };
        }

        // 2. Persistent pending status in DB
        await gameRepo.savePendingContribution(dbConnection, {
            groupId: details.groupId,
            performance: details.rawPerformance,
            graphics: details.rawGraphics,
            youtube: details.rawYoutube,
            prNumber: prDetails.number
        });

        return { success: true, url: prDetails.url, number: prDetails.number };
    }
}

/**
 * Factory for selecting the strategy
 * @param {boolean} isBetaEnabled 
 * @param {any} dbAdapter
 * @returns {ContributionStrategy}
 */
export function getContributionStrategy(isBetaEnabled) {
    if (isBetaEnabled) {
        return new DatabaseAndGitHubStrategy();
    }
    return new GitHubOnlyStrategy();
}
