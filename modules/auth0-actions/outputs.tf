# ========================================
# Auth0 Actions Module - Outputs
# ========================================

output "action_id" {
  description = "Action ID"
  value       = auth0_action.post_login.id
}

output "action_name" {
  description = "Action name"
  value       = auth0_action.post_login.name
}

output "action_deployed" {
  description = "Whether action is deployed"
  value       = auth0_action.post_login.deploy
}

output "trigger_bound" {
  description = "Whether action is bound to trigger"
  value       = var.bind_to_post_login
}