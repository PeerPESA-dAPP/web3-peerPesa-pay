# ===== Build Stage =====
FROM node:20-alpine AS build

WORKDIR /app

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
