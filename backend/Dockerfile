# syntax=docker/dockerfile:1

##########################################################################
# Jobocate Backend (NestJS) - multi-stage production image
#
# Package managers:
#   - backend:            yarn (yarn.lock is the committed lockfile used by
#                         the original Dockerfile). Yarn Classic is lenient
#                         with peer deps, so no --legacy-peer-deps is needed.
#   - packages/contracts: npm (only package-lock.json exists there).
#
# The backend depends on the local workspace package
#   "@jobocate/contracts": "file:../packages/contracts"
# which, with the backend at /app, resolves to /packages/contracts. The
# contracts package MUST be built before the backend install so that its
# compiled dist/ is copied into node_modules/@jobocate/contracts.
#
# Stages:
#   deps    -> contracts build + full backend deps (used by dev compose)
#   builder -> compiles the app with `nest build`
#   runtime -> slim, production-only deps + Chromium (default target)
##########################################################################

# ---------------------------------------------------------------------------
# Stage 1: deps - build contracts + install ALL backend deps
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps

WORKDIR /app

# Shared workspace packages that local file: dependencies rely on
COPY packages /packages
COPY tsconfig.base.json /tsconfig.base.json

# Build the contracts workspace (npm) so its dist/ exists before backend install
WORKDIR /packages/contracts
RUN npm install --no-audit --no-fund
RUN npm run build

# Install backend dependencies (yarn). Puppeteer must not download Chromium
# during install (the runtime stage installs it via apk).
WORKDIR /app
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
COPY backend/package.json backend/yarn.lock ./
RUN yarn install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 2: builder - compile TypeScript (nest build -> dist/src/main.js)
# ---------------------------------------------------------------------------
FROM deps AS builder
WORKDIR /app
COPY backend .
RUN yarn build

# ---------------------------------------------------------------------------
# Stage 3: runtime - slim image with prod deps + Chromium for Puppeteer
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runtime

# Chromium + fonts for Puppeteer (PDF / print rendering)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV NODE_ENV=production \
    PORT=8000 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Built contracts workspace (resolved by file:../packages/contracts)
COPY --from=builder /packages /packages

# Install production-only dependencies
COPY backend/package.json backend/yarn.lock ./
RUN yarn install --production --frozen-lockfile && yarn cache clean

# Compiled application
COPY --from=builder /app/dist ./dist

# Runtime upload directory
RUN mkdir -p uploads/resumes

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Entry point: compiled NestJS bootstrap (src/main.ts -> dist/src/main.js)
CMD ["node", "dist/src/main.js"]
