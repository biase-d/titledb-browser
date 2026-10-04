# syntax=docker/dockerfile:1

# Debian rather than Alpine: sharp and @resvg/resvg-js ship prebuilt glibc
# binaries, and the musl variants would have to be compiled
FROM node:22-slim AS base
ENV NODE_ENV=production


# --- build ------------------------------------------------------------------
# Needs devDependencies (vite, svelte, the @iconify-json sets) which do not
# ship in the final image
FROM base AS builder
WORKDIR /app

COPY package.json package-lock.json ./
# --ignore-scripts: `prepare` runs build:icons, which reads src/ — not copied yet
RUN npm ci --include=dev --ignore-scripts

COPY . .
# Bundles the icon sets, then builds the server. No environment is needed: every
# secret is read at runtime through $env/dynamic/private
RUN npm run build


# --- runtime ----------------------------------------------------------------
FROM base AS runtime
WORKDIR /app

# git is not a convenience here: the sync pipeline clones and pulls the two data
# repositories with simple-git, which shells out to the real binary
RUN apt-get update \
	&& apt-get install -y --no-install-recommends git ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# The server
COPY --from=builder /app/build ./build
COPY app.js ./

# The scheduled task runs the pipeline from source, not from the bundle, so
# scripts/ and src/ have to be present. drizzle/ holds the migrations that
# scripts/bootstrap-db.js applies
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.js ./

# data/ holds the git clones and the log files, .cache the contributor map.
# Mount volumes over both, or every deploy re-clones and every incremental sync
# degrades into a full rebuild
RUN mkdir -p data .cache && chown -R node:node /app/data /app/.cache

ENV HOST=0.0.0.0 \
	PORT=3000 \
	BODY_SIZE_LIMIT=Infinity

EXPOSE 3000
USER node

# ?strict=1 makes the endpoint answer 503 when the database is unreachable, so
# the HTTP status is the verdict. Plain node, because slim has no curl
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/v1/status?strict=1').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "app.js"]
