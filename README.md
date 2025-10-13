# Auth0 Terraform + Azure DevOps: Setup Guide

This guide streamlines setup of Auth0 infrastructure as code with Terraform, S3-native state locking, and Azure DevOps CI/CD.

---

## Prerequisites

* Terraform ≥ 1.11.0 (required for S3-native locking)
* Node.js 20+
* AWS CLI configured
* Auth0 Management API credentials for each environment (dev, qa, val, prod)
* Azure DevOps org with Pipelines and Environments
* GitHub repository connected to Azure DevOps

---

## Phase 1 — Local Setup (One-Time)

### 1.1 S3 Backend

* Create an S3 bucket for Terraform state (per organization). Enable **versioning** and **encryption**.
* DynamoDB is not required. S3-native locking uses a `.tflock` object.

### 1.2 Backend Configuration

Edit the `bucket` per environment backend file and set `use_lockfile = true`.

```hcl
terraform {
  backend "s3" {
    bucket       = "auth0-terraform-state-1234567890"
    key          = "auth0/dev/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
```

Files to update:

* `environments/dev/backend.tf`
* `environments/qa/backend.tf`
* `environments/val/backend.tf`
* `environments/prod/backend.tf`

### 1.3 Auth0 M2M Applications (per environment)

* Auth0 Dashboard → Applications → Create Application → **Machine to Machine**
* Authorize **Auth0 Management API**
* Grant required scopes (at minimum):

  * clients, client_grants, connections: read/create/update/delete
  * branding: read/update
  * prompts: read/update
  * actions: read/create/update/delete
  * attack_protection: read/update
  * log_streams: read/create/update/delete
* Record Domain, Client ID, Client Secret.

### 1.4 Environment Variable Files

Create non-committed `*.tfvars` files per environment. Only commit `*.tfvars.example` or `*.tfvars` with configuration that does not include secrets.

```bash
cp environments/dev/dev.platform.tfvars.example environments/dev/dev.platform.tfvars
```

Example `dev.platform.tfvars`:

```hcl
auth0_domain        = "dev-yourcompany.us.auth0.com"
auth0_client_id     = "YOUR_CLIENT_ID"
auth0_client_secret = "YOUR_CLIENT_SECRET"
environment         = "dev"
```

Ensure `*.tfvars` are `.gitignore`d.

---

## Phase 2 — Local Validation (DEV First)

### 2.1 Verify Terraform Version

```bash
terraform version
```

### 2.2 Export Auth0 Credentials (DEV)

```bash
export AUTH0_DOMAIN="dev-yourcompany.us.auth0.com"
export AUTH0_CLIENT_ID="your_dev_client_id"
export AUTH0_CLIENT_SECRET="your_dev_client_secret"
```

### 2.3 Build and Test Actions

```bash
cd actions
npm ci
npm run build
npm test
```

### 2.4 Initialize and Plan

```bash
cd ../environments/dev
terraform init
terraform plan -var-file=dev.platform.tfvars
```

Validate planned resources (tenant, branding, connections, actions, trigger bindings, attack protection, optional sample app).

### 2.5 Apply to DEV

```bash
terraform apply -var-file=dev.platform.tfvars
```

* Lock file appears during apply: `auth0/dev/terraform.tfstate.tflock`
* State: `auth0/dev/terraform.tfstate`

### 2.6 Verify in Auth0

* Branding: Universal Login reflects colors/logo
* Connections: Passwordless email exists and enabled
* Actions: Custom action present, deployed, bound to Login flow
* Attack Protection: Policies enabled
* Applications: Sample app exists if configured

---

## Phase 3 — Azure DevOps Setup

### 3.1 Variable Groups

Create in **Pipelines → Library**.

**auth0-terraform-common**

```
TF_STATE_BUCKET = auth0-terraform-state-1234567890
TF_STATE_REGION = us-east-1
```

**auth0-dev**

```
AUTH0_DOMAIN = dev-yourcompany.us.auth0.com
AUTH0_CLIENT_ID = <dev_client_id>
AUTH0_CLIENT_SECRET = <dev_secret>    # mark as secret
```

Repeat for **auth0-qa**, **auth0-val**, **auth0-prod**.

### 3.2 AWS Service Connection

Project Settings → Service Connections → New → **AWS**

* Name: `aws-terraform-backend`
* Access Key, Secret Key, Region
* Verify connection

Required IAM permissions for the state bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::auth0-terraform-state-*",
        "arn:aws:s3:::auth0-terraform-state-*/*"
      ]
    }
  ]
}
```

### 3.3 Environments and Approvals

Create Azure DevOps **Environments**:

* `auth0-dev`, `auth0-qa` (no approval)
* `auth0-val` (optional approval)
* `auth0-prod` (approval required)

For `auth0-prod`, add **Approvals and checks** with approvers, a timeout (e.g., 30 days), and a minimum approver count.

### 3.4 Pipeline

Create pipeline from repository `azure-pipelines.yml`. Save and review.

---

## Phase 4 — First CI/CD Run

### 4.1 Trigger

```bash
git add .
git commit -m "Set up CI/CD with S3-native locking"
git push origin main
```

### 4.2 Expected Stages

* Build & Test: build actions, run tests, coverage, validate Terraform for all envs
* Deploy DEV: init (S3 backend), plan, apply, capture outputs
* Deploy QA: automatic after DEV
* Deploy VAL: automatic after QA
* Deploy PROD: pauses for approval

### 4.3 Verify and Approve

* Verify DEV tenant while QA/VAL proceed
* For PROD: review plans and previous environment results, then approve in `auth0-prod` environment

### 4.4 Post-Deploy Verification (PROD)

* Resources match lower envs
* Login flow functions as intended

---

## Operations

### Local Dev Loop

```bash
# Modify modules or actions
# Validate in DEV locally
terraform plan -var-file=dev.platform.tfvars
terraform apply -var-file=dev.platform.tfvars
# Commit to trigger CI/CD
```

### Adding or Updating Actions

* Implement TypeScript action and tests in `actions/`
* `npm test && npm run build`
* Update Terraform modules and apply to DEV
* Push to deploy through pipeline

### Rollbacks

* Prefer `git revert` and push to redeploy
* Emergency manual rollback (PROD): checkout last known good commit, apply with `prod.platform.tfvars`
* Targeted rollback: `terraform taint` or `terraform destroy -target` for specific resources, then apply

---

## Troubleshooting

### Backend configuration changed

```bash
cd environments/dev
terraform init -reconfigure
```

### Action JS file not found

```bash
cd actions
npm ci
npm run build
```

### State locked / cannot acquire lock

* Confirm no concurrent runs
* Inspect S3 prefix for `.tflock`

```bash
aws s3 ls s3://<BUCKET>/auth0/dev/
# If certain it is stale:
aws s3 rm s3://<BUCKET>/auth0/dev/terraform.tfstate.tflock
```

* With versioning, check/delete markers if needed

### AWS credentials error in pipeline

* Service connection `aws-terraform-backend` exists and verifies
* S3 IAM policy present
* Variable group `auth0-terraform-common` set with `TF_STATE_BUCKET`, `TF_STATE_REGION`

### Versioning not enabled

```bash
aws s3api put-bucket-versioning \
  --bucket <BUCKET> \
  --versioning-configuration Status=Enabled
```

### Terraform version too old

Upgrade to ≥ 1.11.0 and re-run `terraform init`.

### Action not enforcing verified email

* Confirm action exists, is deployed, and bound to Login flow
* Inspect state as needed:

```bash
terraform state show module.verified_email_action.auth0_action.post_login
terraform state show module.verified_email_action.auth0_trigger_actions.login
```

---

## Security Checklist

* `*.tfvars` with secrets excluded via `.gitignore`
* Secrets in Azure DevOps variable groups (marked secret)
* S3 bucket: encryption enabled, versioning enabled, public access blocked
* Manual approval gate for PROD
* Least-privilege IAM for S3 state
* No hardcoded secrets in code
* Auth0 M2M apps only
* Terraform state encrypted at rest; access logged via CloudTrail

---

## Monitoring and Observability

* `terraform output` (or pipeline artifacts) for outputs; `-json` for machine use
* Auth0 Dashboard → Monitoring → Logs for login failures and action errors
* Optional Log Streams to SIEM (configure via Terraform module)
* Azure DevOps Pipelines → Runs for success rate, durations, failures; configure alerts as needed

---

## Performance Tips

* Faster local testing: `terraform init -backend=false` or local backend with `-reconfigure`
* Pipeline caching for npm packages
* Path filters and parallel validation where applicable

---

## Next Steps

* Monitor production after first deployment
* Configure log streams
* Enforce MFA for Auth0 tenant admins
* Add Auth0 metrics monitoring
* Document runbooks for common tasks
* Add/iterate actions (e.g., MFA enforcement)
* Periodically review security settings
* Prepare incident response plan
* Train team on Terraform/Auth0 workflows

---

## References

* [Terraform Auth0 Provider](https://registry.terraform.io/providers/auth0/auth0/latest/docs)
* [Auth0 Management API](https://auth0.com/docs/api/management/v2)
* [Terraform S3 Backend (S3-native locking)](https://developer.hashicorp.com/terraform/language/backend/s3)

---

## Support

* Review pipeline logs and Terraform state
* Check Auth0 logs for errors
* Auth0 Support and AWS Support per vendor processes
