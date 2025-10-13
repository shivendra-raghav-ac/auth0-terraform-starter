# ========================================
# Auth0 Attack Protection Module - Outputs
# ========================================

output "suspicious_ip_enabled" {
  description = "Whether suspicious IP throttling is enabled"
  value       = auth0_attack_protection.this.suspicious_ip_throttling[0].enabled
}

output "brute_force_enabled" {
  description = "Whether brute force protection is enabled"
  value       = auth0_attack_protection.this.brute_force_protection[0].enabled
}

output "breached_password_enabled" {
  description = "Whether breached password detection is enabled"
  value       = auth0_attack_protection.this.breached_password_detection[0].enabled
}

output "brute_force_max_attempts" {
  description = "Configured maximum brute force attempts"
  value       = var.brute_force_max_attempts
}