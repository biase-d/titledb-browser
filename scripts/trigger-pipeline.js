import { Octokit } from '@octokit/rest';

const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://switchperformance.biasedproject.com';
const API_ROUTE = `${PRODUCTION_URL}/api/v1/pipeline/run`;
const PIPELINE_SECRET = process.env.PIPELINE_SECRET;

const GITHUB_BOT_TOKEN = process.env.GITHUB_BOT_TOKEN;
const REPO_OWNER = 'biase-d'; // Based on the other files in the project
const REPO_NAME = 'nx-performance-ui'; // Wait, what is the repo name? The package.json says `nx-performance-ui`.

async function triggerFailoverWorkflow(isFullRebuild) {
  console.log('Triggering GitHub Actions Failover workflow...');
  if (!GITHUB_BOT_TOKEN) {
    console.error('Missing GITHUB_BOT_TOKEN, cannot trigger failover workflow.');
    process.exit(1);
  }

  const octokit = new Octokit({ auth: GITHUB_BOT_TOKEN });
  try {
    await octokit.actions.createWorkflowDispatch({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      workflow_id: 'pipeline-failover.yml',
      ref: 'main',
      inputs: {
        full_rebuild: isFullRebuild ? 'true' : 'false'
      }
    });
    console.log('Successfully triggered GitHub Actions workflow.');
  } catch (error) {
    console.error('Failed to trigger GitHub Actions workflow:', error);
    process.exit(1);
  }
}

async function run() {
  if (!PIPELINE_SECRET) {
    console.error('Missing PIPELINE_SECRET. Exiting.');
    process.exit(1);
  }

  const isFullRebuild = process.argv.includes('--full-rebuild');

  console.log(`Pinging primary server API: ${API_ROUTE}...`);
  try {
    // Add custom headers if we need to pass `--full-rebuild` or configure the server endpoint to accept query params
    const response = await fetch(API_ROUTE, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PIPELINE_SECRET}`,
        'Content-Type': 'application/json'
      },
      // You can extend the API to read these values from the body
      body: JSON.stringify({ isFullRebuild })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Pipeline successfully triggered on primary server:', data);
    } else {
      console.error(`Server returned ${response.status} ${response.statusText}`);
      await triggerFailoverWorkflow(isFullRebuild);
    }
  } catch (error) {
    console.error('Failed to ping primary server API:', error.message);
    await triggerFailoverWorkflow(isFullRebuild);
  }
}

run();
