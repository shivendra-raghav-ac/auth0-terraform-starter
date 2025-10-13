# ========================================
# Auth0 Application Module
# ========================================

resource "auth0_client" "sample_regular_web_app" {
  count           = var.enable_app ? 1 : 0
  name            = var.app_name
  app_type        = "regular_web"
  oidc_conformant = true

  # OAuth 2.0 callbacks and origins
  callbacks           = var.callbacks
  allowed_logout_urls = var.allowed_logout_urls
  allowed_origins     = var.allowed_origins
  web_origins         = var.web_origins

  # Grant types for authorization code flow
  grant_types = ["authorization_code", "refresh_token"]

  # JWT configuration
  jwt_configuration {
    lifetime_in_seconds = 300 # 5 minutes
    alg                 = "RS256"
  }

  # Refresh token configuration
  refresh_token {
    rotation_type   = "rotating"
    expiration_type = "expiring"
    token_lifetime  = 2592000 # 30 days in seconds
  }
}