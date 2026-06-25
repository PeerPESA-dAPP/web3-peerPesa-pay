# ===== Build Stage =====
FROM node:20-alpine AS build

WORKDIR /app

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    eudev-dev \
    libusb-dev \
    pkgconf \
    linux-headers

COPY pay/package*.json ./

# Faster and reproducible
RUN npm ci

COPY pay/ .
COPY config/pay.env .env

# Increase Node memory for Next build
ENV NODE_OPTIONS="--max_old_space_size=4096"

RUN npm run build

# ===== Production Stage =====
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 3002

CMD ["node", "server.js"]