# ===== Build Stage =====
FROM node:20 AS build

WORKDIR /app


# system deps for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libudev-dev \
    libusb-1.0-0-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*    

# Install system dependencies for node-gyp
RUN apk add --no-cache \
    linux-headers    

# Install dependencies
COPY pay/package*.json ./
RUN npm install

# Copy source
COPY pay/ .

# Load environment variables for Next.js build
COPY config/pay.env .env

# Build Next.js app (standalone output)
RUN npm run build


# ===== Production Stage =====
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy standalone server output
COPY --from=build /app/.next/standalone ./

# Copy static assets
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 3002

ENV PORT=3002
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
