# ── Stage 1: Build client ──────────────────────────────────────────────
FROM node:22-alpine AS client-build

WORKDIR /app/client

COPY client/package.json client/package-lock.json* ./
RUN npm ci --ignore-scripts

COPY client/ ./

# Vite automatically reads .env.production during `npm run build`
RUN npm run build

# ── Stage 2: Build server ──────────────────────────────────────────────
FROM node:22-alpine AS server-build

WORKDIR /app/server

COPY server/package.json server/package-lock.json* ./
RUN npm ci --ignore-scripts

COPY server/ ./
RUN npm run build

# ── Stage 3: Production ───────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Install only production server dependencies
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm ci --omit=dev --ignore-scripts

# Copy compiled server
COPY --from=server-build /app/server/dist ./server/dist

# Copy built client
COPY --from=client-build /app/client/dist ./client/dist

# Non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

USER appuser

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Cloud Run requires the process to listen on PORT
CMD ["node", "server/dist/index.js"]
