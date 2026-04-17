# syntax=docker/dockerfile:1

# ──────────────────────────────────────────────────────────────
# Stage 1: Build the Go binary
# CGO_ENABLED=0 ensures a fully static binary with no shared
# library dependencies — required for FROM scratch
# ──────────────────────────────────────────────────────────────
FROM golang:1.22-bullseye AS builder

WORKDIR /app

# Copy module files first to leverage Docker layer caching
# Dependencies are only re-downloaded when go.mod/go.sum change
COPY go.mod go.sum ./
RUN go mod download

# Copy the full source tree and build the static binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-w -s" \
    -trimpath \
    -o /app/chat \
    ./cmd/chat

# Pre-create the nonroot user entry and temp directory
# uid 65532 matches the distroless nonroot convention
RUN echo "nonroot:x:65532:65532:nonroot:/app:/sbin/nologin" > /etc/passwd.minimal && \
    echo "nonroot:x:65532:" > /etc/group.minimal && \
    mkdir -p /app/chat-data && \
    chown -R 65532:65532 /app/chat-data

# ──────────────────────────────────────────────────────────────
# Stage 2: Minimal scratch image
# Contains only the binary, certs, passwd and the spool directory
# ──────────────────────────────────────────────────────────────
FROM scratch

# CA certificates for outbound HTTPS calls to Keycloak and login service
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Minimal passwd/group so uid 65532 resolves correctly
COPY --from=builder /etc/passwd.minimal /etc/passwd
COPY --from=builder /etc/group.minimal /etc/group

# Copy the pre-created spool directory with correct ownership
COPY --from=builder --chown=65532:65532 /app/chat-data /app/chat-data

# Copy the compiled binary — this is the entire application
COPY --from=builder /app/chat /chat

# Run as nonroot
USER 65532

EXPOSE 5000

CMD ["/chat"]
