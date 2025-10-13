.PHONY: dev qa val prod test fmt help

# Quick access to environment-specific commands
dev:
	@$(MAKE) -C environments/dev $(TARGET)

qa:
	@$(MAKE) -C environments/qa $(TARGET)

val:
	@$(MAKE) -C environments/val $(TARGET)

prod:
	@$(MAKE) -C environments/prod $(TARGET)

# Run tests for actions
test:
	@echo "Running tests..."
	cd actions && npm test

# Format all Terraform files
fmt:
	@echo "Formatting all Terraform files..."
	terraform fmt -recursive

# Plan all environments
plan-all:
	@echo "Planning all environments..."
	@$(MAKE) -C environments/dev plan
	@$(MAKE) -C environments/qa plan
	@$(MAKE) -C environments/val plan
	@$(MAKE) -C environments/prod plan

# Validate all environments
validate-all:
	@echo "Validating all environments..."
	@$(MAKE) -C environments/dev validate
	@$(MAKE) -C environments/qa validate
	@$(MAKE) -C environments/val validate
	@$(MAKE) -C environments/prod validate

help:
	@echo "Usage: make <environment> TARGET=<target>"
	@echo ""
	@echo "Environments:"
	@echo "  dev     - Development environment"
	@echo "  qa      - QA environment"
	@echo "  val     - Validation environment"
	@echo "  prod    - Production environment"
	@echo ""
	@echo "Examples:"
	@echo "  make dev TARGET=plan     - Plan dev environment"
	@echo "  make prod TARGET=apply   - Apply prod environment"
	@echo "  make test                - Run action tests"
	@echo "  make fmt                 - Format all Terraform files"
	@echo "  make plan-all            - Plan all environments"
	@echo ""
	@echo "Or cd into environment directory:"
	@echo "  cd environments/dev && make plan"