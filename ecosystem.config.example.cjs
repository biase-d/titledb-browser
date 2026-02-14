module.exports = {
    apps: [
        {
            name: "titledb-browser",
            script: "app.js",
            env: {
                NODE_ENV: "production",
                PORT: 3040,
                HOST: "0.0.0.0",
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
                INTERNAL_WEBHOOK_SECRET: "YOUR_WEBHOOK_SECRET"
            }
        }
    ]
};
