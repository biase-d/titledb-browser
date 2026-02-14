module.exports = {
    apps: [
        {
            name: "titledb-browser",
            script: "app.js",
            env: {
                NODE_ENV: "production",
                PORT: 3000,
                ORIGIN: "https://switchperformance.biasedproject.com",
                BODY_SIZE_LIMIT: "Infinity"
            }
        }
    ]
};
