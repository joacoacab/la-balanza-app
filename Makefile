ifneq (,$(wildcard .env))
include .env
export
endif

POSTGRES_USER ?= labalanza
POSTGRES_DB ?= labalanza
BACKUP_DIR ?= backups
BACKUP_FILE ?= $(BACKUP_DIR)/labalanza_$(shell date +%Y%m%d_%H%M%S).sql

.PHONY: help up down restart ps logs logs-web logs-frontend logs-db migrate makemigrations shell check test build-frontend build-frontend-temp clean-frontend-dist backup-db restore-db

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
	@echo "  make build-frontend        Build normal del frontend"
	@echo "  make build-frontend-temp   Build frontend a /tmp si dist local esta bloqueado"
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

build-frontend-temp:
	cd frontend && npm run build -- --outDir /tmp/la-balanza-vite-build --emptyOutDir

clean-frontend-dist:
	rm -rf frontend/dist

backup-db:
	mkdir -p $(BACKUP_DIR)
	docker compose exec -T db pg_dump -U $(POSTGRES_USER) $(POSTGRES_DB) > $(BACKUP_FILE)
	@echo "Backup creado: $(BACKUP_FILE)"

restore-db:
	@test -n "$(FILE)" || (echo "Uso: make restore-db FILE=backups/archivo.sql"; exit 1)
	docker compose exec -T db psql -U $(POSTGRES_USER) -d $(POSTGRES_DB) < $(FILE)
