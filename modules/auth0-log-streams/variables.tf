# ========================================
# Auth0 Log Stream Module - Input Variables
# ========================================

variable "log_stream_name" {
  type        = string
  description = "Name of the log stream"
}

variable "aws_account_id" {
  type        = string
  description = "AWS Account ID for EventBridge"
}

variable "aws_region" {
  type        = string
  description = "AWS region for EventBridge"
}

variable "status" {
  type        = string
  description = "Status of the log stream (active, paused, suspended)"
  default     = "active"
}

variable "filters" {
  type        = list(map(string))
  description = "Event filters for the log stream"
  default     = []
}

variable "is_priority" {
  type        = bool
  description = "Whether this is a priority log stream"
  default     = false
}

# PII Configuration Variables
variable "enable_pii_masking" {
  type        = bool
  description = "Whether to enable PII masking"
  default     = false
}

variable "pii_method" {
  type        = string
  description = "PII handling method (hash or mask)"
  default     = "hash"
}

variable "pii_algorithm" {
  type        = string
  description = "PII handling algorithm (currently only xxhash)"
  default     = "xxhash"
}

variable "pii_log_fields" {
  type        = list(string)
  description = "Log fields to apply PII handling to"
  default     = []
}