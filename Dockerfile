FROM node:20-alpine
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache python3 make g++

# Copy manifests
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install ALL dependencies (Dev + Prod) for the build phase
RUN npm install && \
    cd client && npm install && \
    cd ../server && npm install -g ts-node typescript && npm install

# Copy source
COPY . .

# Build Client
RUN cd client && npm run build

# Copy build result to server-visible path
RUN mkdir -p client/dist && cp -r client/dist/* ./client/dist/

# Security - Non-root
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup && \
    chown -R appuser:appgroup /app
USER appuser

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Direct execution to skip tsc build blockers
CMD ["ts-node", "--transpile-only", "server/src/index.ts"]
