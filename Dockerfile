# ── Stage 1: Build the Vite app ──────────────────────────────────────────────
# Runs on the build machine's own architecture: the output is plain JS/CSS, and
# esbuild crashes under x86 emulation on Apple Silicon. Only stage 2 targets
# the --platform you ask for.
FROM --platform=$BUILDPLATFORM node:20-slim AS builder

WORKDIR /build

COPY starter/package.json starter/package-lock.json ./
RUN npm ci

COPY starter/ .

# Optional. By default the app uses <its own origin>/client-metadata.json,
# which server/metadata.js builds per request, so one image runs at any URL.
# Pass this only to point at metadata hosted somewhere else (Vite bakes it in):
#   --build-arg VITE_OAUTH_CLIENT_ID=https://elsewhere/client-metadata.json
ARG VITE_OAUTH_CLIENT_ID
ENV VITE_OAUTH_CLIENT_ID=$VITE_OAUTH_CLIENT_ID

RUN npm run build

# ── Stage 2: Serve with Node ─────────────────────────────────────────────────
FROM node:20-slim

WORKDIR /app

COPY server/package.json server/app.js server/api.js server/metadata.js server/static.js server/index.js ./server/
COPY --from=builder /build/dist ./starter/dist

ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/index.js"]
