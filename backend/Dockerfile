FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy shared workspace packages that local file dependencies rely on
COPY packages /packages
COPY tsconfig.base.json /tsconfig.base.json

# Build contracts package
WORKDIR /packages/contracts
RUN npm install
RUN npm run build

# Set working directory back to app
WORKDIR /app

# Install backend dependencies first for better layer caching
COPY backend/package*.json backend/yarn.lock ./

# Install Chromium and dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN yarn install --frozen-lockfile

# Copy application files
COPY backend .

# Create uploads directory
RUN mkdir -p uploads/resumes

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "server.js"]
