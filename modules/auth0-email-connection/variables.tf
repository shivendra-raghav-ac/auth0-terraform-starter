# ========================================
# Auth0 Email Connection Module - Input Variables
# ========================================

variable "connection_name" {
  type        = string
  description = "Name of the email connection"
  default     = "email"
}

variable "from_address" {
  type        = string
  description = "From address for passwordless emails (supports Liquid templates)"
  default     = "{{ application.name }} <no-reply@example.com>"
}

variable "subject" {
  type        = string
  description = "Email subject line (supports Liquid templates)"
  default     = "Your sign-in link for {{ application.name }}"
}

variable "template_html" {
  type        = string
  description = "HTML template for the email body"
  default     = "<html><body><p>Use the link we emailed you to sign in.</p></body></html>"
}

variable "disable_signup" {
  type        = bool
  description = "Whether to disable user signup via this connection"
  default     = false
}

variable "scope" {
  type        = string
  description = "OAuth scopes to request"
  default     = "openid email profile offline_access"
}

variable "response_type" {
  type        = string
  description = "OAuth response type"
  default     = "code"
}

variable "totp_time_step" {
  type        = number
  description = "TOTP time step in seconds (how long the code is valid)"
  default     = 300 # 5 minutes
}

variable "totp_length" {
  type        = number
  description = "Number of digits in the TOTP code"
  default     = 6
}