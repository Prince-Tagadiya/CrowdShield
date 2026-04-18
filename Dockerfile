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

# 5. Compile Client Assets
# We bake the environment variables directly into a .env file to ensure Vite 
# picks them up during the compilation step.
RUN printf "\
VITE_FIREBASE_API_KEY=AIzaSyDifc9j2f-Tj6I_ACkhRR6lvGmwiltdtgw\n\
VITE_FIREBASE_AUTH_DOMAIN=crowdshield-3912c.firebaseapp.com\n\
VITE_FIREBASE_PROJECT_ID=crowdshield-3912c\n\
VITE_FIREBASE_STORAGE_BUCKET=crowdshield-3912c.firebasestorage.app\n\
VITE_FIREBASE_MESSAGING_SENDER_ID=864518919258\n\
VITE_FIREBASE_APP_ID=1:864518919258:web:e5ec5f046b6d49e1c57463\n\
VITE_FIREBASE_DATABASE_URL=https://crowdshield-3912c-default-rtdb.firebaseio.com\n\
VITE_GOOGLE_MAPS_API_KEY=AIzaSyC0g0ToC3WPYyJ7_QiE2hBoV_oKHx5NIMI\n\
VITE_GEMINI_API_KEY=AIzaSyDNb_nDZMVc1WfarMb9arJqtxynYVTggNE\n\
" > client/.env.production && \
    cd client && \
    npm run build

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
