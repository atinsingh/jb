# syntax=docker/dockerfile:1

##########################################################################
# Jobocate Frontend (Next.js) - multi-stage production image
#
# Package manager: yarn (yarn.lock is the committed lockfile used by the
# original Dockerfile). Yarn Classic is lenient with peer deps.
#
# NEXT_PUBLIC_* values are inlined into the client bundle at BUILD time from
# a generated frontend/.env.production. The deployment script derives it from
# the combined root file and includes only browser-public NEXT_PUBLIC_* values.
#
# Stages:
#   deps    -> all deps (used by dev compose: `next dev` needs tailwind etc.)
#   builder -> `next build`
#   runtime -> prod deps + .next + `next start` (default target)
##########################################################################

# ---------------------------------------------------------------------------
# Stage 1: deps - install ALL dependencies
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 2: builder - produce the optimized production build
# ---------------------------------------------------------------------------
FROM deps AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY . .
RUN yarn build

# ---------------------------------------------------------------------------
# Stage 3: runtime - slim production server (`next start`)
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Standalone output already contains the minimal production dependencies.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.env.production ./.env.production

EXPOSE 3000

USER nextjs
CMD ["node", "server.js"]
