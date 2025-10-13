# ========================================
# Outputs - VAL Environment
# ========================================

# ========================================
# Environment Metadata
# ========================================

output "environment" {
  description = "Environment name"
  value       = var.environment
}

# ========================================
# Tenant Outputs
# ========================================

output "tenant_id" {
  description = "Auth0 tenant ID"
  value       = module.tenant.tenant_id
}

output "tenant_friendly_name" {
  description = "Auth0 tenant friendly name"
  value       = module.tenant.friendly_name
}

# Note: Auth0 domain is available via $AUTH0_DOMAIN environment variable

# ========================================
# Connection Outputs
# ========================================

output "passwordless_connection_id" {
  description = "Passwordless email connection ID"
  value       = module.passwordless_email.connection_id
}

output "passwordless_connection_name" {
  description = "Passwordless email connection name"
  value       = module.passwordless_email.connection_name
}

# ========================================
# Action Outputs
# ========================================

output "verified_email_action_id" {
  description = "Enforce verified email action ID"
  value       = module.verified_email_action.action_id
}

output "verified_email_action_name" {
  description = "Enforce verified email action name"
  value       = module.verified_email_action.action_name
}

# ========================================
# Application Outputs
# ========================================

output "sample_app_enabled" {
  description = "Whether sample app is enabled"
  value       = var.enable_app
}

output "sample_app_client_id" {
  description = "Sample app client ID (null if disabled)"
  value       = var.enable_app ? module.sample_app.client_id : null
}

output "sample_app_name" {
  description = "Sample app name (null if disabled)"
  value       = var.enable_app ? module.sample_app.app_name : null
}

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LOG STREAM OUTPUTS
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

output "log_stream_id" {
  description = "Auth0 log stream ID"
  value       = var.enable_log_stream ? module.log_stream[0].log_stream_id : null
}

output "aws_partner_event_source" {
  description = "AWS Partner Event Source name (use in EventBridge)"
  value       = var.enable_log_stream ? module.log_stream[0].aws_partner_event_source : null
}

output "log_stream_status" {
  description = "Current log stream status"
  value       = var.enable_log_stream ? module.log_stream[0].log_stream_status : null
}
