set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

default:
    @just --list

dev: db
    pnpm start:dev

db:
    docker compose up -d --wait postgres

up:
    docker compose up -d --build

down:
    docker compose down

reset:
    docker compose down -v
    docker compose up -d --wait postgres

logs:
    docker compose logs -f

test:
    pnpm test

e2e: db
    pnpm test:e2e

lint:
    pnpm lint

check: reset
    pnpm lint
    pnpm test
    pnpm test:e2e

check-docker: reset
    docker compose run --rm --build tests pnpm test
    docker compose run --rm --build tests pnpm test:e2e