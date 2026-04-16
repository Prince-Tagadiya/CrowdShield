FROM node:20-alpine
WORKDIR /app

# 1. Install critical system tools
RUN apk add --no-cache python3 make g++

# 2. Copy all package manifests to pre-cache layers
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# 3. Fast installation - avoiding audits/funding to speed up Cloud Build
RUN npm install --no-audit --no-fund && \
    cd client && npm install --no-audit --no-fund && \
    cd ../server && npm install --no-audit --no-fund

# 4. Copy entire source
COPY . .

# 5. Compile Client Assets
RUN cd client && npm run build

# 6. Global tool setup for runtime
RUN npm install -g ts-node typescript

# 7. Final Security Hardening
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup && \
    chown -R appuser:appgroup /app
USER appuser

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# The Unbreakable Entrypoint
CMD ["ts-node", "--transpile-only", "server/src/index.ts"]
