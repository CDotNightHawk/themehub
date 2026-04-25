# Multi-stage Dockerfile for the themehub web app.
# Builds a self-contained Node 22 image and runs the standalone Next.js output.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Placeholder env vars so `next build` can collect page data. They are
# overridden at runtime by docker-compose / the NixOS module / the operator.
ENV DATABASE_URL=postgres://build:build@localhost:5432/build \
    AUTH_SECRET=build-time-placeholder-build-time-placeholder-build \
    PUBLIC_URL=http://localhost:3000 \
    AUTH_URL=http://localhost:3000 \
    STORAGE_DRIVER=local \
    STORAGE_LOCAL_DIR=./storage
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder /app/public ./public
COPY --from=builder --chown=app:app /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/src/db ./src/db
# drizzle.config.ts is needed so `drizzle-kit push` works inside the container
# (used by the `migrate` one-shot service in docker-compose).
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
USER app
EXPOSE 3000
CMD ["npm", "run", "start"]
