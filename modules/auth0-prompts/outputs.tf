# ========================================
# Auth0 Prompts Module - Outputs
# ========================================

output "prompt_id" {
  description = "Prompt configuration ID"
  value       = auth0_prompt.this.id
}

output "universal_login_experience" {
  description = "Configured login experience"
  value       = auth0_prompt.this.universal_login_experience
}

output "identifier_first" {
  description = "Whether identifier first is enabled"
  value       = auth0_prompt.this.identifier_first
}

output "webauthn_platform_first_factor" {
  description = "Whether WebAuthn platform first factor is enabled"
  value       = auth0_prompt.this.webauthn_platform_first_factor
}

output "prompt_type" {
  description = "The prompt type configured"
  value       = var.prompt_type
}

output "custom_text_languages" {
  description = "Languages with custom text configured"
  value = compact([
    fileexists("${path.root}/i18n/en.json") ? "en" : "",
  ])
}

output "custom_text_en_configured" {
  description = "Whether English custom text is configured"
  value       = fileexists("${path.root}/i18n/en.json")
}