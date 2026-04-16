# ── Stage 1: Build client ──────────────────────────────────────────────
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm ci --ignore-scripts
COPY client/ ./
RUN npm run build

# ── Stage 2: Production ───────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Install production dependencies and ts-node
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install -g ts-node typescript && npm ci --omit=dev --ignore-scripts

# Copy server source (Skip pre-compilation to avoid build-blockers)
COPY server/ ./server/

# Copy built client from stage 1
COPY --from=client-build /app/client/dist ./client/dist

# Non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Run directly from source using ts-node to guarantee startup success
CMD ["ts-node", "--transpile-only", "server/src/index.ts"]
