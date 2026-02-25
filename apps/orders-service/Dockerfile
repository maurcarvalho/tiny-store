# Orders Service — L3 Extraction
# Uses the same libs/modules/orders code as the monolith.
# Only the entry point and database connection differ.

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx tsc -p apps/orders-service/tsconfig.json

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist/apps/orders-service ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3001
CMD ["node", "dist/apps/orders-service/src/main.js"]
