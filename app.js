module.exports = {
    apps: [
        {
            name: "titledb-browser",
            script: "build/index.js",
            env: {
                NODE_ENV: "production",
                PORT: 3000,
                ORIGIN: "https://titledb.com",
                BODY_SIZE_LIMIT: "Infinity"
            }
        }
    ]
};
