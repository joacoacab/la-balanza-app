ifneq (,$(wildcard .env))
include .env
export
endif

POSTGRES_USER ?= labalanza
POSTGRES_DB ?= labalanza
BACKUP_DIR ?= backups
BACKUP_FILE ?= $(BACKUP_DIR)/labalanza_$(shell date +%Y%m%d_%H%M%S).sql

.PHONY: help up down restart ps logs logs-web logs-frontend logs-db migrate makemigrations shell check test build-frontend build-frontend-docker clean-frontend-dist backup-db restore-db

help:
	@echo "Comandos disponibles:"
	@echo "  make up                    Levanta db, backend y frontend"
	@echo "  make down                  Baja los servicios"
	@echo "  make restart               Reinicia los servicios"
	@echo "  make ps                    Muestra estado de servicios"
	@echo "  make logs                  Logs de todos los servicios"
	@echo "  make logs-web              Logs del backend"
	@echo "  make logs-frontend         Logs del frontend"
	@echo "  make logs-db               Logs de Postgres"
	@echo "  make migrate               Corre migraciones dentro del contenedor web"
	@echo "  make makemigrations        Crea migraciones dentro del contenedor web"
	@echo "  make shell                 Abre shell Django dentro del contenedor web"
	@echo "  make check                 Corre manage.py check local"
	@echo "  make test                  Corre tests backend desde host contra DB Docker"
	@echo "  make build-frontend        Build del frontend (requiere Node local)"
	@echo "  make build-frontend-docker Build del frontend via Docker con permisos correctos"
	@echo "  make clean-frontend-dist   Borra frontend/dist generado"
	@echo "  make backup-db             Genera backup SQL en backups/"
	@echo "  make restore-db FILE=...   Restaura backup SQL"

up:
	docker compose up -d db web frontend

down:
	docker compose down

restart:
	docker compose restart

ps:
	docker compose ps

logs:
	docker compose logs -f

logs-web:
	docker compose logs -f web

logs-frontend:
	docker compose logs -f frontend

logs-db:
	docker compose logs -f db

migrate:
	docker compose exec web python manage.py migrate

makemigrations:
	docker compose exec web python manage.py makemigrations

shell:
	docker compose exec web python manage.py shell

check:
	.venv/bin/python backend/manage.py check

test:
	docker compose up -d db
	DB_HOST=127.0.0.1 .venv/bin/pytest backend

build-frontend:
	cd frontend && npm run build

# Alternativa Docker: corre el build dentro del contenedor con el UID/GID del
# host para que frontend/dist quede con permisos del usuario actual (no root
# ni nobody). Usar si no tenés Node instalado localmente.
build-frontend-docker:
	docker run --rm \
		--user $(shell id -u):$(shell id -g) \
		-v $(PWD)/frontend:/app \
		-w /app \
		node:20-alpine \
		sh -c "npm ci && npm run build"

clean-frontend-dist:
	rm -rf frontend/dist

backup-db:
	mkdir -p $(BACKUP_DIR)
	docker compose exec -T db pg_dump -U $(POSTGRES_USER) $(POSTGRES_DB) > $(BACKUP_FILE)
	@echo "Backup creado: $(BACKUP_FILE)"

restore-db:
	@test -n "$(FILE)" || (echo "Uso: make restore-db FILE=backups/archivo.sql"; exit 1)
	docker compose exec -T db psql -U $(POSTGRES_USER) -d $(POSTGRES_DB) < $(FILE)
