# ========================================
# Auth0 Tenant Module - Outputs
# ========================================

output "tenant_id" {
  description = "Auth0 tenant ID"
  value       = auth0_tenant.this.id
}

output "friendly_name" {
  description = "Tenant friendly name"
  value       = auth0_tenant.this.friendly_name
}

output "support_email" {
  description = "Support email"
  value       = auth0_tenant.this.support_email
}

output "support_url" {
  description = "Support URL"
  value       = auth0_tenant.this.support_url
}

output "session_lifetime" {
  description = "Session lifetime in hours"
  value       = auth0_tenant.this.session_lifetime
}
