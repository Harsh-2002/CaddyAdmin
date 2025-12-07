.PHONY: all dev build test docker docker-up docker-down clean install

all: build

dev:
	@./scripts/dev.sh

kill:
	@./scripts/kill.sh

build:
	@./scripts/build.sh

test:
	@cd apps/backend && go test -v ./...
	@cd apps/web && npm test || true

docker:
	@docker build -f docker/Dockerfile -t caddyadmin .

docker-up:
	@docker-compose -f docker/docker-compose.yml up -d

docker-down:
	@docker-compose -f docker/docker-compose.yml down

clean:
	@rm -f caddyadmin
	@rm -rf apps/backend/static/*
	@rm -rf apps/web/.next apps/web/out
	@rm -f *.log

install:
	@cd apps/backend && go mod download
	@cd apps/web && npm install
