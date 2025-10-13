# ========================================
# Auth0 Tenant Module
# ========================================
# Configures tenant-wide settings, sessions, and security flags

resource "auth0_tenant" "this" {
  friendly_name           = var.friendly_name
  allowed_logout_urls     = var.allowed_logout_urls
  support_email           = var.support_email
  support_url             = var.support_url
  enabled_locales         = var.enabled_locales
  default_redirection_uri = var.default_redirection_uri
  session_lifetime        = var.session_lifetime_hours

  # ========================================
  # Session Cookie Configuration
  # ========================================

  session_cookie {
    mode = var.non_persistent_cookie ? "non-persistent" : "persistent"
  }

  # ========================================
  # Session Behavior
  # ========================================

  sessions {
    oidc_logout_prompt_enabled = false
  }

  # ========================================
  # Security and Feature Flags
  # ========================================

  flags {
    # Security
    disable_clickjack_protection_headers = false
    no_disclose_enterprise_connections   = true

    # User Experience
    enable_public_signup_user_exists_error = true
    use_scope_descriptions_for_consent     = true

    # API Management
    disable_management_api_sms_obfuscation = false
    disable_fields_map_fix                 = false
    enable_apis_section                    = true
  }
}