# ========================================
# Auth0 Log Stream Module - Outputs
# ========================================

output "log_stream_id" {
  description = "ID of the log stream"
  value       = auth0_log_stream.eventbridge.id
}

output "log_stream_name" {
  description = "Name of the log stream"
  value       = auth0_log_stream.eventbridge.name
}

output "log_stream_status" {
  description = "Status of the log stream"
  value       = auth0_log_stream.eventbridge.status
}

output "aws_partner_event_source" {
  description = "AWS Partner Event Source name (to be configured in AWS)"
  value       = auth0_log_stream.eventbridge.sink[0].aws_partner_event_source
}