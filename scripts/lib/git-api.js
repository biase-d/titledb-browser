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
  const commitMessage = commit.commit.message;
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
 * @param {Date | null} lastProcessedDate - The timestamp of the last processed PR
 * @returns {Promise<{contributorMap: object, latestMergedAt: Date}>}
 */
export async function buildFullContributorMap(cachedMap = null, lastProcessedDate = null) {
  const contributorMap = cachedMap || { performance: {}, graphics: {}, videos: {} };
  let latestMergedAt = lastProcessedDate;

  for (const type of ['graphics', 'videos']) {
    if (contributorMap[type]) {
      for (const groupId in contributorMap[type]) {
        const value = contributorMap[type][groupId];
        contributorMap[type][groupId] = new Set(Array.isArray(value) ? value : []);
      }
    }
  }

  console.log('Building/updating contributor map from PR history...');
  
  try {
    const prs = await octokit.paginate('GET /repos/{owner}/{repo}/pulls', { 
      owner: 'biase-d', 
      repo: 'nx-performance', 
      state: 'closed', 
      sort: 'updated',
      direction: 'desc',
      per_page: 100 
    });

    const mergedPrs = prs.filter(pr => pr.merged_at);
    if (!latestMergedAt) {
      console.log(`Found ${mergedPrs.length} total merged PRs to process (full build).`);
    } else {
      console.log(`Checking for new PRs merged after ${latestMergedAt.toISOString()}`);
    }
    
    for (const pr of mergedPrs) {
      const mergedAt = new Date(pr.merged_at);
      if (lastProcessedDate && mergedAt <= lastProcessedDate) {
        console.log('No more new PRs to process.');
        break; 
      }

      if (!latestMergedAt || mergedAt > latestMergedAt) {
        latestMergedAt = mergedAt;
      }
      
      const { data: commits } = await octokit.pulls.listCommits({ owner: 'biase-d', repo: 'nx-performance', pull_number: pr.number, per_page: 1 });
      if (commits.length === 0) continue;

      const contributorsInPr = getContributorsFromCommit(commits[0]);
      if (contributorsInPr.length === 0) continue;

      const prInfo = { contributors: contributorsInPr, sourcePrUrl: pr.html_url };

      const { data: files } = await octokit.pulls.listFiles({ owner: 'biase-d', repo: 'nx-performance', pull_number: pr.number, per_page: 100 });
      for (const file of files) {
        const filePath = file.filename;
        let match;
        if ((match = filePath.match(/^profiles\/([A-F0-9]{16})\/(.+)\.json/))) {
          const groupId = match[1];
          const fileBaseName = match[2];
          const [gameVersion, ...suffixParts] = fileBaseName.split('$');
          const suffix = suffixParts.join('$');
          const key = suffix ? `${groupId}-${gameVersion}-${suffix}` : `${groupId}-${gameVersion}`;
          
          // Only assign the contributor info if we haven't already assigned it from a newer PR
          if (!contributorMap.performance[key]) {
            contributorMap.performance[key] = prInfo;
          }
        } else if ((match = filePath.match(/^graphics\/([A-F0-9]{16})\.json/))) {
          const groupId = match[1];
          if (!contributorMap.graphics[groupId]) {
            contributorMap.graphics[groupId] = new Set();
          }
          prInfo.contributors.forEach(c => contributorMap.graphics[groupId].add(c));
        } else if ((match = filePath.match(/^videos\/([A-F0-9]{16})\.json/))) {
          const groupId = match[1];
          if (!contributorMap.videos[groupId]) {
            contributorMap.videos[groupId] = new Set();
          }
          prInfo.contributors.forEach(c => contributorMap.videos[groupId].add(c));
        }
      }
    }

    for (const type of ['graphics', 'videos']) {
      for (const groupId in contributorMap[type]) {
        contributorMap[type][groupId] = Array.from(contributorMap[type][groupId]);
      }
    }

  } catch (apiError) {
    console.error(`Failed to build contributor map from GitHub API: ${apiError.message}`);
  }
  console.log('-> Contributor map build/update complete.');
  return { contributorMap, latestMergedAt };
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