# ========================================
# Auth0 Branding Module
# ========================================
# Configures tenant branding and Universal Login appearance

resource "auth0_branding" "this" {
  logo_url = var.logo_url

  # Brand colors
  colors {
    primary         = var.primary_color
    page_background = var.background_color
  }

  # Custom Universal Login HTML (optional)
  dynamic "universal_login" {
    for_each = var.universal_login_body_file != "" ? [1] : []
    content {
      body = file(var.universal_login_body_file)
    }
  }
}