# ==============================
# LOAD ENV FILE
# ==============================

ifneq (,$(wildcard .env))
include .env
export $(shell sed 's/=.*//' .env)
endif

# ==============================
# DEFAULTS
# ==============================

JAVA_SERVICES=identity gateway portal learn community challenge
SCHEMAS=identity portal learn community challenge
FLYWAY=./tools/flyway/flyway

LOG_DIR=logs

# Allow overriding services
SS ?= $(JAVA_SERVICES)

# ==============================
# INTERNAL FUNCTIONS
# ==============================

define wait_db
	@echo "Waiting for Postgres on localhost:5433..."
	@until pg_isready -h localhost -p $(LOCAL_DB_PORT) -U $(POSTGRES_USER); do \
		sleep 2; \
	done
	@echo "Postgres ready."
endef

define migrate_schema
	@for schema in $(SCHEMAS); do \
		echo "Migrating $$schema..."; \
		$(FLYWAY) \
		  -url=jdbc:postgresql://localhost:$(LOCAL_DB_PORT)/$(POSTGRES_DB) \
		  -user=$(POSTGRES_USER) \
		  -password=$(POSTGRES_PASSWORD) \
		  -schemas=$$schema \
		  -locations=filesystem:infra/migrations/$$schema \
		  migrate || exit 1; \
	done
	@echo "Migrations complete."
endef

# ==============================
# COMMANDS
# ==============================

start:
	@mkdir -p $(LOG_DIR)
	$(call wait_db)
	$(call migrate_schema)
	@echo "Starting services: $(SS)"
	@for s in $(SS); do \
		echo "Starting $$s..."; \
		( \
			cd $$s || exit 1; \
			DATABASE_URL=$(DATABASE_URL) \
			POSTGRES_USER=$(POSTGRES_USER) \
			POSTGRES_PASSWORD=$(POSTGRES_PASSWORD) \
			JWT_SECRET=$(JWT_SECRET) \
			INTERNAL_GATEWAY_SECRET=$(INTERNAL_GATEWAY_SECRET) \
			./mvnw spring-boot:run \
		) > $(LOG_DIR)/$$s.log 2>&1 & \
	done
	@echo "Done."

test:
	@mkdir -p $(LOG_DIR)
	@echo "Running tests for: $(SS)"
	@for s in $(SS); do \
		echo "Testing $s..."; \
		( \
			cd $$s || exit 1; \
			DATABASE_URL=$(DATABASE_URL) \
			POSTGRES_USER=$(POSTGRES_USER) \
			POSTGRES_PASSWORD=$(POSTGRES_PASSWORD) \
			JWT_SECRET=$(JWT_SECRET) \
			INTERNAL_GATEWAY_SECRET=$(INTERNAL_GATEWAY_SECRET) \
			./mvnw test \
		) > $(LOG_DIR)/$$s.log 2>&1 & \
	done
	@echo "OPEN LOGS"

restart:
	@echo "Restarting services: $(SS)"
	@for s in $(SS); do \
		pkill -f "$$s.*spring-boot" || true; \
	done
	@$(MAKE) start SS="$(SS)"

stop:
	@echo "Stopping services: $(SS)"
	@for s in $(SS); do \
		pkill -f "$$s.*spring-boot" || true; \
	done

status:
	@echo "Running Spring processes:"
	@ps aux | grep spring | grep -v grep || true
