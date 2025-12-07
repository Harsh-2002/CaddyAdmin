# CaddyAdmin

A modern web UI for managing Caddy Server with automatic HTTPS, reverse proxy configuration, and real-time metrics.

## Quick Start

### Using Docker

```bash
docker run -d \
  -p 4000:4000 \
  -e ADMIN_USER=admin \
  -e ADMIN_PASSWORD_HASH='$2a$10$...' \
  -e CADDY_API_URL=http://caddy:2019 \
  ghcr.io/Harsh-2002/caddyadmin:latest
```

### Development

```bash
# Clone and install
git clone https://github.com/Harsh-2002/caddyadmin.git
cd caddyadmin
make install

# Start dev servers (backend:4000, frontend:3000)
make dev
```

### Build from Source

```bash
make build
./caddyadmin
```

## Authentication Setup

Generate a password hash:

```bash
./scripts/generate-password-hash.sh yourpassword
```

Then set environment variables before starting:

```bash
export ADMIN_USER=admin
export ADMIN_PASSWORD_HASH='$2a$10$...'
```

> **Note**: Use bcrypt cost factor **10-12** for production. Higher values (13+) significantly increase login time. The UI has a 60-second timeout to accommodate slow operations.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ADMIN_USER` | Yes | `admin` | Admin username |
| `ADMIN_PASSWORD_HASH` | Yes | - | Bcrypt hashed password |
| `CADDY_API_URL` | No | `http://localhost:2019` | Caddy Admin API endpoint |
| `SERVER_PORT` | No | `4000` | Backend server port |
| `DATABASE_PATH` | No | `./caddyadmin.db` | SQLite database path |
| `SESSION_DURATION` | No | `8` | Session duration (hours) |
| `JWT_SECRET` | No | auto-generated | JWT signing secret |
| `COOKIE_SECURE` | No | `false` | Set to `true` for HTTPS |

## Features

- Site & upstream management
- Automatic HTTPS with Let's Encrypt
- Real-time metrics dashboard
- Caddyfile editor with syntax highlighting
- Configuration history & rollback
- Environment-based authentication

## License

MIT - See [LICENSE](LICENSE)
