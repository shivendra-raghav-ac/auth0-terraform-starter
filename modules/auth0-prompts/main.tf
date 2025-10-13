# ========================================
# Auth0 Prompts Module
# Configures Universal Login experience and custom text/translations
# ========================================

resource "auth0_prompt" "this" {
  universal_login_experience     = var.universal_login_experience
  identifier_first               = var.identifier_first
  webauthn_platform_first_factor = var.webauthn_platform_first_factor
}

# ========================================
# Custom Text - Multi-Language Support
# Files loaded from: environments/<env>/i18n/<language>.json
# ========================================

# English (default/fallback)
resource "auth0_prompt_custom_text" "login_en" {
  count    = fileexists("${path.root}/i18n/en.json") ? 1 : 0
  prompt   = var.prompt_type
  language = "en"
  body     = file("${path.root}/i18n/en.json")
}