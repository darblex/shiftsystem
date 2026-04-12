# ---- deps stage ----
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies only (leverage layer cache)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ---- builder stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Build the Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner stage ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy only what's needed to run
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create data directory for SQLite (Railway will mount a volume here)
RUN mkdir -p /data && chown nextjs:nodejs /data

USER nextjs

# Railway injects PORT automatically; Next.js honours this env var
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Runtime env vars expected:
#   JWT_SECRET    — secret string for signing JWT tokens
#   DATABASE_URL  — path or connection string for SQLite/Postgres

CMD ["node", "server.js"]
