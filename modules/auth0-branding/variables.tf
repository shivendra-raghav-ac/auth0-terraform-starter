# ========================================
# Auth0 Branding Module - Input Variables
# ========================================

variable "logo_url" {
  type        = string
  description = "URL to the logo image (must be HTTPS)"
  default     = ""
}

variable "primary_color" {
  type        = string
  description = "Primary brand color in hex format"
  default     = "#0059d6"
}

variable "background_color" {
  type        = string
  description = "Background color for login page in hex format"
  default     = "#000000"
}

variable "universal_login_body_file" {
  type        = string
  description = "Path to custom Universal Login HTML template file"
  default     = ""
}