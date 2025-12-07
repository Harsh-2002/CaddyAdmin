# Contributing to CaddyAdmin

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/Harsh-2002/caddyadmin.git
   cd caddyadmin
   ```
3. **Set up development environment**:
   ```bash
   # Backend (Go 1.21+)
   cd apps/backend
   go mod download
   
   # Frontend (Node.js 18+)
   cd apps/web
   npm install
   ```

## Development Workflow

### Running Locally

```bash
# Start both services
./scripts/dev.sh

# Or manually:
# Terminal 1 - Backend
cd apps/backend && go run main.go

# Terminal 2 - Frontend
cd apps/web && npm run dev
```

### Making Changes

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Run tests: `make test`
4. Commit with clear messages: `git commit -m "feat: add new feature"`
5. Push to your fork: `git push origin feature/my-feature`
6. Open a Pull Request

## Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

## Code Style

- **Go**: Follow standard Go formatting (`gofmt`)
- **TypeScript/React**: ESLint + Prettier configuration in `apps/web`

## Reporting Issues

- Use GitHub Issues
- Include steps to reproduce
- Include environment details (OS, Go version, Node version)

## Questions?

Open a Discussion on GitHub or reach out to maintainers.
