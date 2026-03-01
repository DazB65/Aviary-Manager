FROM node:20-alpine
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.4.1

# Copy dependency manifests and patches first for layer caching
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install ALL dependencies (dev deps needed for: vite build, esbuild, drizzle-kit migrate)
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build frontend (vite → dist/public/) and server (esbuild → dist/index.js)
RUN pnpm build

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "dist/index.js"]

