# ========================================
# Environment Metadata
# ========================================

variable "environment" {
  type        = string
  description = "Environment name (dev, qa, val, prod)"
  default     = "val"
}

# ========================================
# Auth0 Provider Configuration
# ========================================

variable "auth0_domain" {
  type        = string
  description = "Auth0 tenant domain (e.g., val-yourcompany.us.auth0.com)"
  default     = ""
}

# ========================================
# Tenant Configuration
# ========================================

variable "tenant_friendly_name" {
  type        = string
  description = "Friendly display name for the Auth0 tenant"
  default     = "VAL Tenant"
}

variable "allowed_logout_urls" {
  type        = list(string)
  description = "URLs allowed after logout"
  default     = []
}

variable "support_email" {
  type        = string
  description = "Support email address displayed to users"
  default     = ""
}

variable "support_url" {
  type        = string
  description = "Support URL displayed to users"
  default     = ""
}

variable "default_redirection_uri" {
  type        = string
  description = "Default URI to redirect to after authentication"
  default     = ""
}

variable "enabled_locales" {
  type        = list(string)
  description = "List of enabled locales for the tenant"
  default     = ["en"]
}

variable "session_lifetime_hours" {
  type        = number
  description = "Session lifetime in hours"
  default     = 168
}

variable "idle_session_lifetime_hours" {
  type        = number
  description = "Idle session lifetime in hours"
  default     = 72
}

variable "non_persistent_cookie" {
  type        = bool
  description = "Use non-persistent session cookies (more secure)"
  default     = true
}

# ========================================
# Branding Configuration
# ========================================

variable "branding_logo_url" {
  type        = string
  description = "URL for branding logo (must be HTTPS)"
  default     = ""
}

variable "primary_color" {
  type        = string
  description = "Primary brand color (hex format)"
  default     = "#0059d6"
}

variable "background_color" {
  type        = string
  description = "Background color for login page (hex format)"
  default     = "#000000"
}

variable "universal_login_body_file" {
  type        = string
  description = "Path to custom Universal Login HTML template"
  default     = ""
}

# ========================================
# Prompts Configuration
# ========================================

variable "universal_login_experience" {
  type        = string
  description = "Universal login experience (classic or new)"
  default     = "new"
}

variable "identifier_first" {
  type        = bool
  description = "Enable identifier-first login flow"
  default     = true
}

variable "webauthn_platform_first_factor" {
  type        = bool
  description = "Use identifier and biometrics first (requires MFA)"
  default     = false
}

# ========================================
# Prompt Screen Partials
# ========================================

variable "enable_prompt_screen_partials" {
  type        = bool
  description = "Enable custom HTML/CSS/JS injection into prompt screens"
  default     = false
}

variable "prompt_screen_partials_type" {
  type        = string
  description = "Prompt type for screen partials (login, signup, etc.)"
  default     = "login"
}

variable "prompt_screen_partials" {
  type = list(object({
    screen_name      = string
    insertion_points = map(string)
  }))
  description = "Screen partials configuration for custom HTML/CSS/JS"
  default     = []
}

# ========================================
# Attack Protection Configuration Variables
# ========================================

# Global
variable "allowlist_ips" {
  type        = list(string)
  description = "IP addresses to exempt from attack protection"
  default     = []
}

# Suspicious IP Throttling
variable "enable_suspicious_ip_throttling" {
  type        = bool
  description = "Enable suspicious IP throttling"
  default     = true
}

variable "suspicious_ip_shields" {
  type        = list(string)
  description = "Shields for suspicious IP throttling"
  default     = ["admin_notification", "block"]
}

variable "suspicious_pre_login_max_attempts" {
  type        = number
  description = "Max login attempts before suspicious IP throttling (FREE TIER: must be 1)"
  default     = 1
}

variable "suspicious_pre_login_rate_ms" {
  type        = number
  description = "Time window in milliseconds"
  default     = 86400000
}

variable "suspicious_pre_user_registration_max_attempts" {
  type        = number
  description = "Max registration attempts"
  default     = 50
}

variable "suspicious_pre_user_registration_rate_ms" {
  type        = number
  description = "Registration time window in milliseconds"
  default     = 1200
}

# Brute Force Protection
variable "enable_brute_force_protection" {
  type        = bool
  description = "Enable brute force protection"
  default     = true
}

variable "brute_force_max_attempts" {
  type        = number
  description = "Max failed login attempts"
  default     = 10
}

variable "brute_force_mode" {
  type        = string
  description = "Brute force mode"
  default     = "count_per_identifier_and_ip"
}

variable "brute_force_shields" {
  type        = list(string)
  description = "Brute force shields"
  default     = ["block", "user_notification"]
}

# Breached Password Detection
variable "enable_breached_password_detection" {
  type        = bool
  description = "Enable breached password detection (requires paid plan)"
  default     = false
}

variable "breached_password_method" {
  type        = string
  description = "Detection method (standard or enhanced)"
  default     = "standard"
}

variable "breached_password_shields" {
  type        = list(string)
  description = "Breached password shields"
  default     = ["admin_notification", "block"]
}

variable "breached_password_pre_user_registration_shields" {
  type        = list(string)
  description = "Shields during signup"
  default     = ["block"]
}

variable "breached_password_pre_change_password_shields" {
  type        = list(string)
  description = "Shields during password change"
  default     = ["block", "admin_notification"]
}

# ========================================
# Email Connection Configuration
# ========================================

variable "email_from_address" {
  type        = string
  description = "From address for passwordless emails (can use liquid templates)"
  default     = "{{ application.name }} <no-reply@example.com>"
}

variable "email_subject" {
  type        = string
  description = "Subject line for passwordless emails (can use liquid templates)"
  default     = "Your sign-in link for {{ application.name }}"
}

# ========================================
# Application Configuration
# ========================================

variable "enable_app" {
  type        = bool
  description = "Enable sample application (typically only in dev)"
  default     = false
}

variable "app_callbacks" {
  type        = list(string)
  description = "Allowed callback URLs for the application"
  default     = []
}

variable "app_allowed_logout_urls" {
  type        = list(string)
  description = "Allowed logout URLs for the application"
  default     = []
}

variable "app_allowed_origins" {
  type        = list(string)
  description = "Allowed origins (CORS) for the application"
  default     = []
}

variable "app_web_origins" {
  type        = list(string)
  description = "Allowed web origins for the application"
  default     = []
}

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LOG STREAM VARIABLES
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

variable "enable_log_stream" {
  type        = bool
  description = "Enable Auth0 log streaming to AWS EventBridge"
  default     = false
}

variable "log_stream_name" {
  type        = string
  description = "Name of the log stream"
  default     = ""
}

variable "aws_account_id" {
  type        = string
  description = "AWS Account ID for EventBridge (from runtime config)"
  default     = ""
}

variable "aws_region" {
  type        = string
  description = "AWS region for EventBridge (from runtime config)"
  default     = "us-east-1"
}

variable "log_stream_status" {
  type        = string
  description = "Status of log stream"
  default     = "active"
}

variable "log_stream_filters" {
  type = list(object({
    type = string
    name = string
  }))
  description = "Event filters for log stream"
  default     = []
}

variable "log_stream_is_priority" {
  type        = bool
  description = "Priority log stream flag (cannot be changed after creation)"
  default     = false
}

variable "enable_pii_masking" {
  type        = bool
  description = "Enable PII masking in log stream"
  default     = false
}

variable "pii_method" {
  type        = string
  description = "PII masking method (hash or mask)"
  default     = "hash"
}

variable "pii_algorithm" {
  type        = string
  description = "PII hashing algorithm (xxhash)"
  default     = "xxhash"
}

variable "pii_log_fields" {
  type        = list(string)
  description = "Fields to apply PII masking to"
  default     = []
}