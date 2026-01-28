# =============================================================================
# Teu-Im Web App — Multi-stage Docker Build
# =============================================================================
# Stage 1 (deps):     Install dependencies with pnpm
# Stage 2 (builder):  Build the Next.js app
# Stage 3 (runner):   Minimal production image
# =============================================================================

FROM node:20-alpine AS deps

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace manifests (only what's needed for dependency resolution)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/desktop/package.json ./apps/desktop/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY packages/supabase/package.json ./packages/supabase/

# Install dependencies (frozen lockfile for reproducibility)
RUN pnpm install --frozen-lockfile --ignore-scripts 2>/dev/null || pnpm install --frozen-lockfile

# =============================================================================
# Stage 2: Builder
# =============================================================================

FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy installed deps from stage 1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules 2>/dev/null || true
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules 2>/dev/null || true

# Copy all source
COPY . .

# Build shared packages first, then web
RUN pnpm --filter @teu-im/shared run build 2>/dev/null || true
RUN pnpm --filter @teu-im/ui run build 2>/dev/null || true
RUN pnpm --filter @teu-im/web run build

# =============================================================================
# Stage 3: Production Runner
# =============================================================================

FROM node:20-alpine AS runner

WORKDIR /app

# Non-root user for security
RUN addgroup --gid 1001 --system nodejs && \
    adduser --uid 1001 --system nextjs nodejs

# Copy built artifacts
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public 2>/dev/null || true

# Copy shared package build output (required at runtime)
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist 2>/dev/null || true
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production

CMD ["node", "apps/web/server.js"]
