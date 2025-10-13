# ========================================
# Auth0 Branding Module - Outputs
# ========================================

output "logo_url" {
  description = "Configured logo URL"
  value       = auth0_branding.this.logo_url
}

output "primary_color" {
  description = "Configured primary brand color"
  value       = auth0_branding.this.colors[0].primary
}

output "background_color" {
  description = "Configured background color"
  value       = auth0_branding.this.colors[0].page_background
}