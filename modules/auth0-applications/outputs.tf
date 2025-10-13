# ========================================
# Auth0 Application Module - Outputs
# ========================================

output "client_id" {
  description = "Application client ID (null if disabled)"
  value       = var.enable_app ? auth0_client.sample_regular_web_app[0].client_id : null
}

output "app_name" {
  description = "Application name (null if disabled)"
  value       = var.enable_app ? auth0_client.sample_regular_web_app[0].name : null
}

output "app_type" {
  description = "Application type (null if disabled)"
  value       = var.enable_app ? auth0_client.sample_regular_web_app[0].app_type : null
}

output "enabled" {
  description = "Whether the application is enabled"
  value       = var.enable_app
}