# ========================================
# Terraform Version Constraints (Root)
# ========================================
# This file defines Terraform and provider version requirements
# Note: Each environment directory has its own versions.tf that inherits these

terraform {
  # Terraform CLI version
  required_version = ">= 1.13.3"

  # Provider requirements
  required_providers {
    auth0 = {
      source  = "auth0/auth0"
      version = "~> 1.32.0" # Allows 1.31.x, blocks 1.32.0+
    }
  }
}

# ========================================
# Auth0 Provider Configuration
# ========================================
# Credentials are provided via environment variables:
#   - AUTH0_DOMAIN
#   - AUTH0_CLIENT_ID
#   - AUTH0_CLIENT_SECRET
#
# This allows different credentials per environment
# without hardcoding secrets in the codebase

provider "auth0" {
  # No explicit configuration needed
  # Provider automatically reads from environment variables
}