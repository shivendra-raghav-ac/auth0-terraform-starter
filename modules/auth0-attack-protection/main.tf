# ========================================
# Auth0 Attack Protection Module
# ========================================
# Configures three types of attack protection:
# 1. Suspicious IP Throttling
# 2. Brute Force Protection
# 3. Breached Password Detection

resource "auth0_attack_protection" "this" {

  # ========================================
  # Suspicious IP Throttling
  # ========================================
  # Blocks IPs with suspicious activity patterns

  suspicious_ip_throttling {
    enabled   = var.enable_suspicious_ip_throttling
    allowlist = var.allowlist_ips
    shields   = var.suspicious_ip_shields

    # Pre-login threshold (before user enters credentials)
    pre_login {
      max_attempts = var.suspicious_pre_login_max_attempts
      rate         = var.suspicious_pre_login_rate_ms
    }

    # Pre-user registration threshold
    pre_user_registration {
      max_attempts = var.suspicious_pre_user_registration_max_attempts
      rate         = var.suspicious_pre_user_registration_rate_ms
    }
  }

  # ========================================
  # Brute Force Protection
  # ========================================
  # Blocks repeated failed login attempts

  brute_force_protection {
    enabled      = var.enable_brute_force_protection
    allowlist    = var.allowlist_ips
    max_attempts = var.brute_force_max_attempts
    mode         = var.brute_force_mode
    shields      = var.brute_force_shields
  }

  # ========================================
  # Breached Password Detection
  # ========================================
  # Prevents use of compromised passwords

  dynamic "breached_password_detection" {
    for_each = var.enable_breached_password_detection ? [1] : []
    content {
      enabled = true
      method  = var.breached_password_method
      shields = var.breached_password_shields

      # Block breached passwords during signup
      pre_user_registration {
        shields = var.breached_password_pre_user_registration_shields
      }

      # Block breached passwords during password change
      pre_change_password {
        shields = var.breached_password_pre_change_password_shields
      }
    }
  }
}