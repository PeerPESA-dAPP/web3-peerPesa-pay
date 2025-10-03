# Step 1: Build stage
FROM node:current-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

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

EXPOSE 3008
CMD ["npm", "start"]

