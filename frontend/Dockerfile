FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy application files
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["yarn", "dev"]
