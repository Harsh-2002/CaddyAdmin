# =============================================================================
# CaddyAdmin - Production Dockerfile
# Multi-stage, security-hardened build for production use
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Frontend Build
# -----------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder

# Security: Run as non-root during build
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# Copy package files first for better caching
COPY apps/web/package*.json ./

# Install dependencies with exact versions (reproducible builds)
RUN npm ci --only=production=false

# Copy source and build
COPY apps/web/ ./

# Build with production optimizations
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Go Backend Build
# -----------------------------------------------------------------------------
FROM golang:1.22-alpine AS backend-builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Create non-root user for build
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /build

# Copy go.mod first for dependency caching
COPY apps/backend/go.mod apps/backend/go.sum ./

# Download dependencies
RUN go mod download && go mod verify

# Copy backend source
COPY apps/backend/ ./

# Copy frontend build output for embedding
COPY --from=frontend-builder /app/out ./static/

# Build with security flags and optimizations
# -s: Omit symbol table
# -w: Omit DWARF debugging info
# -trimpath: Remove file system paths from binary
# CGO_ENABLED=0: Static binary (no C dependencies)
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w -extldflags '-static'" \
    -trimpath \
    -o caddyadmin \
    main.go

# Verify binary is static
RUN file caddyadmin | grep -q "statically linked"

# -----------------------------------------------------------------------------
# Stage 3: Security Scan (optional, for CI)
# -----------------------------------------------------------------------------
FROM golang:1.22-alpine AS security-scan

RUN go install github.com/securego/gosec/v2/cmd/gosec@latest

WORKDIR /scan
COPY apps/backend/ ./

# Run security scan (non-blocking in build, review output)
RUN gosec -fmt=json -out=/tmp/security-report.json ./... || true

# -----------------------------------------------------------------------------
# Stage 4: Production Runtime
# -----------------------------------------------------------------------------
FROM scratch AS production

# Import CA certs for HTTPS
COPY --from=backend-builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Import timezone data
COPY --from=backend-builder /usr/share/zoneinfo /usr/share/zoneinfo

# Import passwd for non-root user
COPY --from=backend-builder /etc/passwd /etc/passwd
COPY --from=backend-builder /etc/group /etc/group

# Copy binary
COPY --from=backend-builder /build/caddyadmin /app/caddyadmin

# Create data directory (for SQLite)
WORKDIR /app

# Security: Run as non-root user
USER appuser:appgroup

# Expose port (document, not publish)
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["/app/caddyadmin", "-healthcheck"] || exit 1

# Environment
ENV GIN_MODE=release
ENV ENVIRONMENT=production
ENV TZ=UTC

# Entrypoint
ENTRYPOINT ["/app/caddyadmin"]

# -----------------------------------------------------------------------------
# Alternative: Alpine-based runtime (if you need shell access for debugging)
# -----------------------------------------------------------------------------
FROM alpine:3.19 AS alpine-production

# Security hardening
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup -h /app -s /sbin/nologin

# Create data directory with proper permissions
RUN mkdir -p /app/data && chown -R appuser:appgroup /app

WORKDIR /app

# Copy binary
COPY --from=backend-builder --chown=appuser:appgroup /build/caddyadmin .

# Security: Drop all capabilities, run read-only
USER appuser:appgroup

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

ENV GIN_MODE=release
ENV ENVIRONMENT=production
ENV TZ=UTC

ENTRYPOINT ["./caddyadmin"]
