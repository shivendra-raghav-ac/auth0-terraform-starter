# ========================================
# Terraform Backend Configuration (PROD)
# ========================================
# Update bucket name and KMS key before use

terraform {
  backend "s3" {
    bucket  = "auth0-terraform-state"
    key     = "auth0/dev/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true

    # S3-native state locking (Terraform 1.11.0+), replaces DynamoDB table
    use_lockfile = true
  }
}