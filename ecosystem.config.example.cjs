module.exports = {
    apps: [
        {
            name: "titledb-browser",
            script: "app.js",
            env: {
                NODE_ENV: "production",
                PORT: 3040,
                HOST: "127.0.0.1",
                ORIGIN: "https://your-domain.com",
                BODY_SIZE_LIMIT: "Infinity",
                AUTH_SECRET: "YOUR_AUTH_SECRET",
                BLOB_READ_WRITE_TOKEN: "YOUR_VERCEL_BLOB_TOKEN",
                DATABASE_URL: "YOUR_DATABASE_URL",
                GITHUB_BOT_TOKEN: "YOUR_GITHUB_TOKEN",
                GITHUB_ID: "YOUR_GITHUB_APP_ID",
                GITHUB_SECRET: "YOUR_GITHUB_APP_SECRET",
                POSTGRES_URL: "YOUR_DATABASE_URL",
                PUBLIC_AUTH_TRUST: "TRUE",
                INTERNAL_WEBHOOK_SECRET: "YOUR_WEBHOOK_SECRET",
                PIPELINE_SECRET: "YOUR_PIPELINE_SECRET"
            }
        },
        {
            name: "pipeline-cron",
            script: "scripts/trigger-pipeline.js",
            // The PM2 cron format. "0 */12 * * *" runs it every 12 hours.
            // If you want to run it daily at midnight, use "0 0 * * *"
            cron_restart: "0 */12 * * *",
            autorestart: false,
            env: {
                // Point this to your local running titledb-browser instance
                PRODUCTION_URL: "http://127.0.0.1:3040",
                PIPELINE_SECRET: "YOUR_PIPELINE_SECRET",
                // Required if you want it to trigger the GitHub Actions fallback on timeout
                GITHUB_BOT_TOKEN: "YOUR_GITHUB_TOKEN" 
            }
        }
    ]
};
