# ========================================
# Auth0 Email Connection Module
# ========================================
# Creates a passwordless email authentication connection
# Uses OTP (One-Time Password) sent via email

resource "auth0_connection" "passwordless_email" {
  strategy = "email"
  name     = var.connection_name

  options {
    name                   = var.connection_name
    from                   = var.from_address
    subject                = var.subject
    syntax                 = "liquid"
    template               = var.template_html
    disable_signup         = var.disable_signup
    brute_force_protection = true
    non_persistent_attrs   = []

    # OAuth parameters
    auth_params = {
      scope         = var.scope
      response_type = var.response_type
    }

    # TOTP (Time-based One-Time Password) configuration
    totp {
      time_step = var.totp_time_step # Seconds
      length    = var.totp_length    # Digits in code
    }
  }
}