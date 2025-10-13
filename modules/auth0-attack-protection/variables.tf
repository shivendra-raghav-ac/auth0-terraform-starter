# ========================================
# Auth0 Attack Protection Module - Input Variables
# ========================================

# ========================================
# Global Settings
# ========================================

variable "allowlist_ips" {
  type        = list(string)
  description = "IP addresses to exempt from attack protection (e.g., office IPs, VPN IPs)"
  default     = []
}

# ========================================
# Suspicious IP Throttling
# ========================================

variable "enable_suspicious_ip_throttling" {
  type        = bool
  description = "Enable suspicious IP throttling"
  default     = true
}

variable "suspicious_ip_shields" {
  type        = list(string)
  description = "Shields for suspicious IP throttling (admin_notification, block)"
  default     = ["admin_notification", "block"]
}

variable "suspicious_pre_login_max_attempts" {
  type        = number
  description = "Maximum login attempts before suspicious IP throttling triggers (FREE TIER: must be <= rate, typically 1)"
  default     = 1
}

variable "suspicious_pre_login_rate_ms" {
  type        = number
  description = "Time window in milliseconds for suspicious IP detection (24 hours = 86400000)"
  default     = 86400000
}

variable "suspicious_pre_user_registration_max_attempts" {
  type        = number
  description = "Maximum registration attempts before throttling"
  default     = 50
}

variable "suspicious_pre_user_registration_rate_ms" {
  type        = number
  description = "Time window in milliseconds for registration throttling"
  default     = 1200
}

# ========================================
# Brute Force Protection
# ========================================

variable "enable_brute_force_protection" {
  type        = bool
  description = "Enable brute force protection"
  default     = true
}

variable "brute_force_max_attempts" {
  type        = number
  description = "Maximum failed login attempts before brute force protection triggers"
  default     = 10
}

variable "brute_force_mode" {
  type        = string
  description = "Brute force protection mode (count_per_identifier_and_ip or count_per_identifier)"
  default     = "count_per_identifier_and_ip"

  validation {
    condition     = contains(["count_per_identifier_and_ip", "count_per_identifier"], var.brute_force_mode)
    error_message = "Mode must be either 'count_per_identifier_and_ip' or 'count_per_identifier'."
  }
}

variable "brute_force_shields" {
  type        = list(string)
  description = "Shields for brute force protection (block, user_notification)"
  default     = ["block", "user_notification"]
}

# ========================================
# Breached Password Detection
# ========================================

variable "enable_breached_password_detection" {
  type        = bool
  description = "Enable breached password detection (REQUIRES PAID AUTH0 PLAN - Professional or Enterprise)"
  default     = false
}

variable "breached_password_method" {
  type        = string
  description = "Detection method for breached passwords (standard or enhanced)"
  default     = "standard"

  validation {
    condition     = contains(["standard", "enhanced"], var.breached_password_method)
    error_message = "Method must be either 'standard' or 'enhanced'."
  }
}

variable "breached_password_shields" {
  type        = list(string)
  description = "Shields for breached password detection (admin_notification, block)"
  default     = ["admin_notification", "block"]
}

variable "breached_password_pre_user_registration_shields" {
  type        = list(string)
  description = "Shields for breached passwords during signup"
  default     = ["block"]
}

variable "breached_password_pre_change_password_shields" {
  type        = list(string)
  description = "Shields for breached passwords during password change"
  default     = ["block", "admin_notification"]
}