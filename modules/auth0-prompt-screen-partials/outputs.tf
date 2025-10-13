# ========================================
# Auth0 Prompt Screen Partials Module - Outputs
# ========================================

output "configured_screens" {
  description = "List of screen names that have partials configured"
  value       = [for sp in var.screen_partials : sp.screen_name]
}

output "screen_count" {
  description = "Number of screens with partials configured"
  value       = length(var.screen_partials)
}

output "prompt_type" {
  description = "The prompt type these partials are for"
  value       = var.prompt_type
}

output "resource_created" {
  description = "Whether any screen partials were created"
  value       = length(var.screen_partials) > 0
}