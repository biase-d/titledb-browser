import { simpleGit } from 'simple-git';
import { Octokit } from '@octokit/rest';
import path from 'node:path';

const git = simpleGit();
const octokit = new Octokit({ auth: process.env.ACCESS_TOKEN });

/**
 * Clones a repository if it doesn't exist, or pulls the latest changes if it does
 * @param {string} repoPath - The local path to the repository
 * @param {string} repoUrl - The remote URL of the repository
 */
export async function cloneOrPull(repoPath, repoUrl) {
  try {
    // A simple way to check for existence is to get its status
    await git.cwd(repoPath).status();
    console.log(`Pulling latest changes for ${repoPath}...`);
    await git.cwd(repoPath).pull();
  } catch (e) {
    console.log(`Cloning ${repoUrl} into ${repoPath}...`);
    await git.clone(repoUrl, repoPath);
  }
}

function getContributorsFromCommit(commit) {
  const contributors = new Set();
  const coAuthorRegex = /Co-authored-by:.*<(?:\d+\+)?(?<username>[\w-]+)@users\.noreply\.github\.com>/g;
  const commitMessage = commit.message;
  const coAuthorMatches = [...commitMessage.matchAll(coAuthorRegex)];

  for (const match of coAuthorMatches) {
    if (match.groups.username) {
      contributors.add(match.groups.username);
    }
  }
  return Array.from(contributors);
}

/**
 * Builds or updates a map of contributors by fetching merged Pull Requests from the GitHub API
 * @param {object | null} cachedMap - The previously cached contributor map
 * @param {Date | null} lastProcessedDate - The timestamp of the last processed PR merge
 * @returns {Promise<{contributorMap: object, latestMergedAt: Date, groupsChanged: boolean}>}
 */
export async function buildFullContributorMap(cachedMap = null, lastProcessedDate = null) {
  const contributorMap = cachedMap || { performance: {}, graphics: {}, videos: {}, groups: {} };
  let latestMergedAt = lastProcessedDate;
  let groupsChanged = false;

  // Initialize Sets from cached arrays, normalizing old string values to arrays
  for (const type of ['graphics', 'videos', 'groups']) {
    if (contributorMap[type]) {
      for (const key in contributorMap[type]) {
        const value = contributorMap[type][key];
        contributorMap[type][key] = new Set(Array.isArray(value) ? value : (value ? [value] : []));
      }
    }
  }
  if (contributorMap.performance) {
    for (const key in contributorMap.performance) {
      const perfEntry = contributorMap.performance[key];
      if (perfEntry && perfEntry.contributors) {
        const value = perfEntry.contributors;
        perfEntry.contributors = new Set(Array.isArray(value) ? value : (value ? [value] : []));
      }
    }
  }

  console.log('Building/updating contributor map from PR history using GraphQL API...');

  let searchQuery = 'repo:biase-d/nx-performance is:pr is:merged';
  if (lastProcessedDate) {
    searchQuery += ` merged:>${lastProcessedDate.toISOString()}`;
    console.log(`Checking for new PRs merged after ${lastProcessedDate.toISOString()}`);
  } else {
    console.log('Processing all merged PRs (full build)...');
  }

  const PULL_REQUEST_QUERY = `
    query paginate($cursor: String, $searchQuery: String!) {
      search(query: $searchQuery, type: ISSUE, first: 50, after: $cursor) {
        pageInfo { hasNextPage, endCursor }
        nodes {
          ... on PullRequest {
            mergedAt
            url
            commits(last: 1) {
              nodes {
                commit {
                  message
                }
              }
            }
            files(first: 100) {
              nodes {
                path
              }
            }
          }
        }
      }
    }`;

  try {
    let hasNextPage = true;
    let cursor = null;
    const allPrNodes = [];

    while (hasNextPage) {
      const { search } = await octokit.graphql(PULL_REQUEST_QUERY, { searchQuery, cursor });
      allPrNodes.push(...search.nodes);
      hasNextPage = search.pageInfo.hasNextPage;
      cursor = search.pageInfo.endCursor;
    }

    for (const pr of allPrNodes) {
      const mergedAt = new Date(pr.mergedAt);
      if (!latestMergedAt || mergedAt > latestMergedAt) {
        latestMergedAt = mergedAt;
      }

      if (!pr.commits.nodes || pr.commits.nodes.length === 0) continue;

      const lastCommit = pr.commits.nodes[0].commit;
      const contributorsInPr = getContributorsFromCommit(lastCommit);
      if (contributorsInPr.length === 0) continue;

      const prInfo = { contributors: contributorsInPr, sourcePrUrl: pr.url };

      for (const file of pr.files.nodes) {
        const filePath = file.path;
        let match;
        if ((match = filePath.match(/^profiles\/([A-F0-9]{16})\/(.+)\.json/))) {
          const groupId = match[1];
          const fileBaseName = match[2];
          const [gameVersion, ...suffixParts] = fileBaseName.split('$');
          const suffix = suffixParts.join('$');
          const key = suffix ? `${groupId}-${gameVersion}-${suffix}` : `${groupId}-${gameVersion}`;

          if (!contributorMap.performance[key]) {
            contributorMap.performance[key] = { contributors: new Set(), sourcePrUrl: null };
          }
          prInfo.contributors.forEach(c => contributorMap.performance[key].contributors.add(c));
          if (!contributorMap.performance[key].sourcePrUrl) {
            contributorMap.performance[key].sourcePrUrl = prInfo.sourcePrUrl;
          }
        } else if ((match = filePath.match(/^(graphics|videos|groups)\/([A-F0-9]{16})\.json/))) {
          const type = match[1];
          const groupId = match[2];
          if (type === 'groups') groupsChanged = true;
          if (!contributorMap[type]) contributorMap[type] = {};
          if (!contributorMap[type][groupId]) {
            contributorMap[type][groupId] = new Set();
          }
          prInfo.contributors.forEach(c => contributorMap[type][groupId].add(c));
        }
      }
    }

    // Convert all Sets back to arrays for JSON serialization
    for (const type of ['graphics', 'videos', 'groups']) {
      if (!contributorMap[type]) continue;
      for (const key in contributorMap[type]) {
        contributorMap[type][key] = Array.from(contributorMap[type][key]);
      }
    }
    for (const key in contributorMap.performance) {
      if (contributorMap.performance[key].contributors instanceof Set) {
        contributorMap.performance[key].contributors = Array.from(contributorMap.performance[key].contributors);
      }
    }
  } catch (apiError) {
    console.error(`Failed to build contributor map from GitHub API: ${apiError.message}`);
    throw apiError; // Re-throw to halt the build process on API failure
  }

  console.log('-> Contributor map build/update complete.');
  return { contributorMap, latestMergedAt, groupsChanged };
}

/**
 * Builds a map of last-updated dates for all data files using a single, efficient git command
 * @param {string} repoPath - The local path to the data repository
 * @returns {Promise<object>} The map of file paths to their last-updated dates
 */
export async function buildDateMapOptimized(repoPath) {
  console.log('Building file date map from Git history (optimized)...');
  const dateMap = { performance: {}, graphics: {}, videos: {} };

  const logOutput = await git.cwd(repoPath).raw([
    'log',
    '--name-only',
    '--format=format:--%ct', // %ct is the committer timestamp as a UNIX timestamp
    '--no-renames',
    '--',
    'profiles', 'graphics', 'videos'
  ]);

  let currentTimestamp = 0;
  for (const line of logOutput.split('\n')) {
    if (line.startsWith('--')) {
      currentTimestamp = parseInt(line.substring(2), 10) * 1000;
      continue;
    }
    
    if (line.trim() === '') continue;

    const filePath = line.trim();
    let match;
    if ((match = filePath.match(/^profiles\/([A-F0-9]{16})\/(.+)\.json/))) {
      const groupId = match[1];
      const baseName = match[2];
      const [gameVersion, ...suffixParts] = baseName.split('$');
      const suffix = suffixParts.join('$');
      const key = suffix ? `${groupId}-${gameVersion}-${suffix}` : `${groupId}-${gameVersion}`;
      if (!dateMap.performance[key]) dateMap.performance[key] = new Date(currentTimestamp);
    } else if ((match = filePath.match(/^(graphics|videos)\/([A-F0-9]{16})\.json/))) {
      const type = match[1];
      const groupId = match[2];
      if (!dateMap[type][groupId]) dateMap[type][groupId] = new Date(currentTimestamp);
    }
  }

  console.log('File date map built.');
  return dateMap;
}