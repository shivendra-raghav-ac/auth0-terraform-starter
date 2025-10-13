# ========================================
# Auth0 Tenant Module - Input Variables
# ========================================

variable "friendly_name" {
  type        = string
  description = "Friendly display name for the tenant"
  default     = ""
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
  default     = 168 # 7 days
}

variable "idle_session_lifetime_hours" {
  type        = number
  description = "Idle session lifetime in hours (currently not used by resource)"
  default     = 72 # 3 days
}

variable "non_persistent_cookie" {
  type        = bool
  description = "Use non-persistent session cookies (more secure, session-only)"
  default     = true
}