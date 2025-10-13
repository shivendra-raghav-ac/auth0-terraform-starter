# ========================================
# Auth0 Email Connection Module - Outputs
# ========================================

output "connection_id" {
  description = "Email connection ID"
  value       = auth0_connection.passwordless_email.id
}

output "connection_name" {
  description = "Email connection name"
  value       = auth0_connection.passwordless_email.name
}

output "strategy" {
  description = "Connection strategy type"
  value       = auth0_connection.passwordless_email.strategy
}