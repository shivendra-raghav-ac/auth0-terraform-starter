# ========================================
# Auth0 Prompt Screen Partials Module - Input Variables
# ========================================

variable "prompt_type" {
  type        = string
  description = "The prompt to add partials for"

  validation {
    condition = contains([
      "login-id", "login", "login-password", "signup",
      "signup-id", "signup-password", "login-passwordless",
      "customized-consent"
    ], var.prompt_type)
    error_message = "Invalid prompt type for screen partials"
  }
}

variable "screen_partials" {
  type = list(object({
    screen_name      = string
    insertion_points = map(string)
  }))
  description = <<-EOT
    Screen partials configuration.
    
    Example:
    [
      {
        screen_name = "login"
        insertion_points = {
          form_content_start = "<div class='banner'>Welcome</div>"
          form_footer_end    = "<div class='footer'>© 2025</div>"
        }
      }
    ]
    
    Available insertion points:
    - form_content: Content inside the form
    - form_content_start: Start of form
    - form_content_end: End of form
    - form_footer_start: Start of footer
    - form_footer_end: End of footer
    - secondary_actions_start: Start of secondary actions
    - secondary_actions_end: End of secondary actions
  EOT
  default     = []
}