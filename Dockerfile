FROM node:20-alpine
WORKDIR /app

# 1. Install critical system tools
RUN apk add --no-cache python3 make g++

# 2. Copy all package manifests to pre-cache layers
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# 3. Fast installation
RUN npm install --no-audit --no-fund && \
    cd client && npm install --no-audit --no-fund && \
    cd ../server && npm install --no-audit --no-fund

# 4. Copy entire source
COPY . .

# 5. Compile Client Assets with Secure Build Arguments
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_DATABASE_URL
ARG VITE_GEMINI_API_KEY
ARG VITE_GOOGLE_MAPS_API_KEY

RUN export VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY && \
    export VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN && \
    export VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID && \
    export VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET && \
    export VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID && \
    export VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID && \
    export VITE_FIREBASE_DATABASE_URL=$VITE_FIREBASE_DATABASE_URL && \
    export VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY && \
    export VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY && \
    cd client && npm run build

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
