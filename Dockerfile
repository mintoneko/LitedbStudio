FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/core/package*.json ./packages/core/
COPY packages/server/package*.json ./packages/server/
COPY packages/client/package*.json ./packages/client/
COPY packages/studio/package*.json ./packages/studio/

# Install dependencies
RUN npm install --omit=dev

# Copy source files
COPY packages/ ./packages/
COPY bin/ ./bin/

# Environment configurations
ENV NODE_ENV=production
ENV LITEDB_PORT=3000
ENV LITEDB_HOST=0.0.0.0
ENV LITEDB_PATH=/data/litedb.db

# Expose HTTP port
EXPOSE 3000

# Persistent volume for SQLite database file
VOLUME ["/data"]

CMD ["node", "bin/litedb.js"]
