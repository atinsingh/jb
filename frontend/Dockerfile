# syntax=docker/dockerfile:1

##########################################################################
# Jobocate Frontend (Next.js) - multi-stage production image
#
# Package manager: yarn (yarn.lock is the committed lockfile used by the
# original Dockerfile). Yarn Classic is lenient with peer deps.
#
# NEXT_PUBLIC_* values are inlined into the client bundle at BUILD time, so
# NEXT_PUBLIC_API_URL must be provided as a build arg for production images.
#
# Stages:
#   deps    -> all deps (used by dev compose: `next dev` needs tailwind etc.)
#   builder -> `next build`
#   runtime -> prod deps + .next + `next start` (default target)
##########################################################################

# ---------------------------------------------------------------------------
# Stage 1: deps - install ALL dependencies
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 2: builder - produce the optimized production build
# ---------------------------------------------------------------------------
FROM deps AS builder
WORKDIR /app

# Backend URL baked into the client bundle (override at build time)
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

COPY . .
RUN yarn build

# ---------------------------------------------------------------------------
# Stage 3: runtime - slim production server (`next start`)
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1

# Production-only dependencies (Next is a runtime dependency)
COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile && yarn cache clean

# Build output + assets required by `next start`
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js

EXPOSE 3000

CMD ["yarn", "start"]
