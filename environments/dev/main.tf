# ========================================
# Auth0 Tenant Configuration (DEV)
# ========================================
# Core tenant settings: session behavior, URLs, locales

module "tenant" {
  source = "../../modules/auth0-tenant"

  friendly_name               = var.tenant_friendly_name
  allowed_logout_urls         = var.allowed_logout_urls
  support_email               = var.support_email
  support_url                 = var.support_url
  default_redirection_uri     = var.default_redirection_uri
  enabled_locales             = var.enabled_locales
  session_lifetime_hours      = var.session_lifetime_hours
  idle_session_lifetime_hours = var.idle_session_lifetime_hours
  non_persistent_cookie       = var.non_persistent_cookie
}

# ========================================
# Branding & Universal Login Theme
# ========================================
# Visual appearance: logo, colors, custom HTML

module "branding" {
  source = "../../modules/auth0-branding"

  logo_url                  = var.branding_logo_url
  primary_color             = var.primary_color
  background_color          = var.background_color
  universal_login_body_file = var.universal_login_body_file
}

# ========================================
# Login Prompts
# ========================================

module "prompts" {
  source = "../../modules/auth0-prompts"

  universal_login_experience     = var.universal_login_experience
  identifier_first               = var.identifier_first
  webauthn_platform_first_factor = var.webauthn_platform_first_factor
  prompt_type                    = "login"
}

# ========================================
# Prompts Screen Partials
# ========================================

module "prompt_screen_partials" {
  source = "../../modules/auth0-prompt-screen-partials"
  count  = var.enable_prompt_screen_partials ? 1 : 0

  prompt_type     = var.prompt_screen_partials_type
  screen_partials = var.prompt_screen_partials
}

# ========================================
# Attack Protection Settings
# ========================================
# Suspicious IP, brute force, breached passwords

module "attack_protection" {
  source = "../../modules/auth0-attack-protection"

  # Global
  allowlist_ips = var.allowlist_ips

  # Suspicious IP Throttling
  enable_suspicious_ip_throttling               = var.enable_suspicious_ip_throttling
  suspicious_ip_shields                         = var.suspicious_ip_shields
  suspicious_pre_login_max_attempts             = var.suspicious_pre_login_max_attempts
  suspicious_pre_login_rate_ms                  = var.suspicious_pre_login_rate_ms
  suspicious_pre_user_registration_max_attempts = var.suspicious_pre_user_registration_max_attempts
  suspicious_pre_user_registration_rate_ms      = var.suspicious_pre_user_registration_rate_ms

  # Brute Force Protection
  enable_brute_force_protection = var.enable_brute_force_protection
  brute_force_max_attempts      = var.brute_force_max_attempts
  brute_force_mode              = var.brute_force_mode
  brute_force_shields           = var.brute_force_shields

  # Breached Password Detection
  enable_breached_password_detection              = var.enable_breached_password_detection
  breached_password_method                        = var.breached_password_method
  breached_password_shields                       = var.breached_password_shields
  breached_password_pre_user_registration_shields = var.breached_password_pre_user_registration_shields
  breached_password_pre_change_password_shields   = var.breached_password_pre_change_password_shields
}

# ========================================
# Authentication Connections
# ========================================
# Passwordless email connection

module "passwordless_email" {
  source = "../../modules/auth0-email-connection"

  connection_name = "email"
  from_address    = var.email_from_address
  subject         = var.email_subject
}

# ========================================
# Auth0 Actions (Runtime Logic)
# ========================================
# Post-login action: enforce verified email

module "verified_email_action" {
  source = "../../modules/auth0-actions"

  action_name        = "enforce-verified-email"
  deploy             = true
  bind_to_post_login = true
  action_js_path     = "${path.root}/../../actions/dist/post-login-action.js"
}

# ========================================
# Applications (OAuth Clients)
# ========================================
# Sample regular web application

module "sample_app" {
  source = "../../modules/auth0-applications"

  enable_app          = var.enable_app
  app_name            = "dev-sample-regular-web"
  callbacks           = var.app_callbacks
  allowed_logout_urls = var.app_allowed_logout_urls
  allowed_origins     = var.app_allowed_origins
  web_origins         = var.app_web_origins
}

# ========================================
# Log Streams
# ========================================

module "log_stream" {
  source = "../../modules/auth0-log-streams"
  count  = var.enable_log_stream ? 1 : 0

  log_stream_name = var.log_stream_name
  aws_account_id  = var.aws_account_id
  aws_region      = var.aws_region
  status          = var.log_stream_status

  filters     = var.log_stream_filters
  is_priority = var.log_stream_is_priority

  # PII Configuration
  enable_pii_masking = var.enable_pii_masking
  pii_method         = var.pii_method
  pii_algorithm      = var.pii_algorithm
  pii_log_fields     = var.pii_log_fields
}
