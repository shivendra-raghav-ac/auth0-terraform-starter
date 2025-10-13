# ========================================
# Terraform & Provider Version Constraints
# ========================================

terraform {
  required_version = ">= 1.13.3"

  required_providers {
    auth0 = {
      source  = "auth0/auth0"
      version = "~> 1.32.0"
    }
  }
}

# ========================================
# Auth0 Provider Configuration
# ========================================
# Credentials via environment variables:
#   - AUTH0_DOMAIN
#   - AUTH0_CLIENT_ID
#   - AUTH0_CLIENT_SECRET

provider "auth0" {
  # No explicit configuration needed
  # Provider reads from environment variables
}