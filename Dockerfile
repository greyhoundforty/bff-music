# ── Stage 1: Build the Vite app ──────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /build

COPY starter/package.json starter/package-lock.json ./
RUN npm ci

COPY starter/ .

# Must be passed at build time — Vite bakes this into the JS bundle.
# docker build --build-arg VITE_OAUTH_CLIENT_ID=https://your-app-url/client-metadata.json
ARG VITE_OAUTH_CLIENT_ID
ENV VITE_OAUTH_CLIENT_ID=$VITE_OAUTH_CLIENT_ID

RUN npm run build

# ── Stage 2: Serve with Node ─────────────────────────────────────────────────
FROM node:20-slim

WORKDIR /app

COPY server/package.json server/app.js server/api.js server/static.js server/index.js ./server/
COPY --from=builder /build/dist ./starter/dist

ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/index.js"]
