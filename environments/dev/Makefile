# ========================================
# Makefile - DEV Environment
# ========================================
# Terraform automation for Auth0 DEV environment
# Usage: make <target>
# Example: make plan

SHELL := /bin/bash

TF ?= terraform
NPM ?= npm
ENV = dev
ACTIONS_DIR = ../../actions
TFVARS_FILE = $(ENV).platform.tfvars.json

.PHONY: help build test init plan apply apply-plan destroy fmt validate clean state-list check

# ========================================
# Default Target
# ========================================

.DEFAULT_GOAL := help

# ========================================
# Build & Test Targets
# ========================================

## Build TypeScript actions
build:
	@echo "🔨 Building TypeScript actions..."
	cd $(ACTIONS_DIR) && $(NPM) ci && $(NPM) run build

## Run action tests
test:
	@echo "🧪 Running action tests..."
	cd $(ACTIONS_DIR) && $(NPM) test

## Run tests with coverage
test-coverage:
	@echo "🧪 Running action tests with coverage..."
	cd $(ACTIONS_DIR) && $(NPM) run test:coverage

# ========================================
# Terraform Lifecycle
# ========================================

## Initialize Terraform (must run first)
init: build
	@echo "⚙️  Initializing Terraform..."
	$(TF) init -reconfigure

## Plan infrastructure changes
plan: build
	@echo "📋 Planning Terraform changes..."
	$(TF) fmt -recursive
	$(TF) validate
	$(TF) plan -var-file=$(TFVARS_FILE) -out=tfplan

## Apply infrastructure changes with auto-approve
apply: build
	@echo "🚀 Applying Terraform changes..."
	$(TF) apply -var-file=$(TFVARS_FILE) -auto-approve

## Apply changes from saved plan
apply-plan:
	@echo "🚀 Applying saved Terraform plan..."
	$(TF) apply tfplan

## Destroy infrastructure (DANGEROUS - requires confirmation)
destroy:
	@echo "💣 WARNING: This will destroy all infrastructure!"
	@read -p "Type 'yes' to confirm destruction: " confirm && [ "$$confirm" = "yes" ]
	$(TF) destroy -var-file=$(TFVARS_FILE)

# ========================================
# Validation & Formatting
# ========================================

## Format Terraform files
fmt:
	@echo "🎨 Formatting Terraform files..."
	$(TF) fmt -recursive

## Validate Terraform configuration
validate: build
	@echo "✅ Validating Terraform configuration..."
	$(TF) validate

## Check formatting without making changes
fmt-check:
	@echo "🔍 Checking Terraform formatting..."
	$(TF) fmt -check -recursive

# ========================================
# Utilities
# ========================================

## Clean build artifacts and Terraform files
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf .terraform
	rm -f .terraform.lock.hcl
	rm -f terraform.tfstate*
	rm -f tfplan
	cd $(ACTIONS_DIR) && rm -rf dist node_modules

## Show current Terraform state
state-list:
	@echo "📋 Listing Terraform state resources..."
	$(TF) state list

## Show outputs
outputs:
	@echo "📤 Showing Terraform outputs..."
	$(TF) output

## Full workflow: test -> build -> fmt -> validate -> plan
check: test build fmt-check validate plan
	@echo "✅ All checks passed!"

# ========================================
# Help
# ========================================

## Show this help message
help:
	@echo "=========================================="
	@echo "Auth0 Terraform - DEV Environment"
	@echo "=========================================="
	@echo ""
	@echo "Available targets:"
	@echo ""
	@echo "  Build & Test:"
	@echo "    build          - Build TypeScript actions"
	@echo "    test           - Run action tests"
	@echo "    test-coverage  - Run tests with coverage report"
	@echo ""
	@echo "  Terraform Lifecycle:"
	@echo "    init           - Initialize Terraform (run first)"
	@echo "    plan           - Plan infrastructure changes"
	@echo "    apply          - Apply changes with auto-approve"
	@echo "    apply-plan     - Apply saved plan file"
	@echo "    destroy        - Destroy all infrastructure (DANGEROUS)"
	@echo ""
	@echo "  Validation:"
	@echo "    fmt            - Format Terraform files"
	@echo "    fmt-check      - Check formatting without changes"
	@echo "    validate       - Validate Terraform configuration"
	@echo "    check          - Run all checks (test, build, fmt, validate, plan)"
	@echo ""
	@echo "  Utilities:"
	@echo "    clean          - Clean build artifacts"
	@echo "    state-list     - List Terraform state resources"
	@echo "    outputs        - Show Terraform outputs"
	@echo "    help           - Show this help message"
	@echo ""
	@echo "Examples:"
	@echo "  make init      - First time setup"
	@echo "  make check     - Run all validation checks"
	@echo "  make plan      - Preview changes"
	@echo "  make apply     - Deploy changes"
	@echo ""