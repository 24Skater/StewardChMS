# Backend Dockerfile
# Uses tsx for TypeScript execution (matches dev setup)
FROM node:20-slim

# Install OpenSSL and wget for Prisma and healthcheck
RUN apt-get update -y && apt-get install -y openssl wget && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace package files
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

# Install all dependencies (need tsx for runtime)
RUN npm ci

# Copy source files
COPY shared/ ./shared/
COPY backend/ ./backend/

# Build shared package
WORKDIR /app/shared
RUN npm run build

# Generate Prisma client
WORKDIR /app/backend
RUN npx prisma generate

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start the server using tsx (TypeScript executor)
CMD ["npx", "tsx", "src/index.ts"]

