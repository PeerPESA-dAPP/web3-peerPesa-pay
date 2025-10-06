# Step 1: Build stage
FROM node:current-alpine AS builder

# Install build tools, linux headers, and libudev development package
RUN apk add --no-cache python3 make g++ bash linux-headers eudev-dev

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./

# Silence npm audit/funding/deprecation warnings
RUN npm config set loglevel=error && \
    npm config set fund false && \
    npm config set audit false

# Install dependencies
RUN npm install --legacy-peer-deps


# Copy the rest of the app
COPY . .

# Delete any existing .next folder before rebuilding
RUN rm -rf .next

# Build the app (Next.js or any Node build process)
# RUN npm run build
RUN NODE_OPTIONS="--max-old-space-size=1024" npm run build

# Step 2: Run stage
FROM node:current-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy built app from builder
COPY --from=builder /app ./

EXPOSE 3008

CMD ["npm", "start"]
