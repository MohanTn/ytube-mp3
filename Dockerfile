# syntax=docker/dockerfile:1

# ---- build the React client ----
FROM node:22-bookworm-slim AS client-build
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json ./client/
RUN npm ci --ignore-scripts
COPY client ./client
RUN npm run build

# ---- production dependencies only ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json ./client/
RUN npm ci --omit=dev --ignore-scripts

# ---- runtime ----
FROM node:22-bookworm-slim AS runtime

# "latest" tracks the newest release; pass a release tag to pin one.
ARG YTDLP_VERSION=latest

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg ca-certificates curl \
 && if [ "$YTDLP_VERSION" = "latest" ]; then \
      YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux"; \
    else \
      YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp_linux"; \
    fi \
 && curl -fsSL -o /usr/local/bin/yt-dlp "$YTDLP_URL" \
 && chmod +x /usr/local/bin/yt-dlp \
 && apt-get purge -y curl \
 && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3010 \
    DATA_DIR=/data \
    STAGING_DIR=/data/staging \
    YTDLP_PATH=yt-dlp \
    FFMPEG_PATH=ffmpeg

COPY --from=deps /app/node_modules ./node_modules
COPY --from=client-build /app/client/dist ./client/dist
COPY package.json ./
COPY server ./server

# Finished MP3s live here only until the browser downloads them.
RUN mkdir -p /data && chown -R node:node /data /app
USER node

EXPOSE 3010
CMD ["node", "server/index.js"]
