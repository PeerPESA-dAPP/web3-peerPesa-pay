# Step 1: Build stage
FROM node:current-alpine AS builder

# Install build tools and linux headers
RUN apk add --no-cache python3 make g++ bash linux-headers


WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./

# Silence npm audit/funding/deprecation warnings
RUN npm config set loglevel=error && \
    npm config set fund false && \
    npm config set audit false

RUN npm install  --legacy-peer-deps

# Copy the rest of the app
COPY . .

# Build Next.js
RUN npm run build

# Step 2: Run stage
FROM node:current-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy built app from builder
COPY --from=builder /app ./

EXPOSE 3019
CMD ["npm", "start"]