FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.base.json nx.json ./
COPY libs/ libs/
COPY apps/orders-service/ apps/orders-service/

RUN npx tsc -p apps/orders-service/tsconfig.json

FROM node:20-alpine AS runner

WORKDIR /app
COPY --from=builder /app/package.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=builder /app/dist/apps/orders-service ./dist

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/main.js"]
