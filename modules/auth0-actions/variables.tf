# ========================================
# Auth0 Actions Module - Input Variables
# ========================================

variable "action_name" {
  type        = string
  description = "Name of the Auth0 action (displayed in dashboard)"
  default     = "enforce-verified-email"
}

variable "deploy" {
  type        = bool
  description = "Whether to deploy the action immediately (true = active, false = draft)"
  default     = true
}

variable "bind_to_post_login" {
  type        = bool
  description = "Whether to bind this action to the post-login trigger flow"
  default     = true
}

variable "action_js_path" {
  type        = string
  description = "Absolute or relative path to the compiled JavaScript file for the action"
  default     = "../../actions/dist/post-login-action.js"
}