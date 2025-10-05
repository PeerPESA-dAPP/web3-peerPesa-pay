# ========= Development Stage =========
FROM node:current-alpine AS dev

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Expose Next.js default port
EXPOSE 3000

# Run Next.js in dev mode (auto reload)
CMD ["npm", "run", "dev"]


# ========= Production Build Stage =========
FROM node:current-alpine AS builder

RUN apk add --no-cache python3 make g++ bash linux-headers eudev-dev

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build


# ========= Production Runner =========
FROM node:current-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app ./

EXPOSE 3008
CMD ["npm", "start"]
