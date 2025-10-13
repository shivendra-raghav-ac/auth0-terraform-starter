# ========================================
# Auth0 Application Module - Input Variables
# ========================================

variable "enable_app" {
  type        = bool
  description = "Whether to create the application"
  default     = false
}

variable "app_name" {
  type        = string
  description = "Name of the Auth0 application"
  default     = "sample-regular-web"
}

variable "callbacks" {
  type        = list(string)
  description = "Allowed callback URLs for the application"
  default     = []
}

variable "allowed_logout_urls" {
  type        = list(string)
  description = "Allowed logout URLs for the application"
  default     = []
}

variable "allowed_origins" {
  type        = list(string)
  description = "Allowed origins (CORS) for the application"
  default     = []
}

variable "web_origins" {
  type        = list(string)
  description = "Allowed web origins for the application"
  default     = []
}