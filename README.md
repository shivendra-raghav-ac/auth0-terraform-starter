# Auth0 Terraform + Azure DevOps: Enterprise Setup Guide

This guide streamlines setup of Auth0 infrastructure as code with Terraform, S3-native state locking, separated CI/CD pipelines, and Azure DevOps with enterprise best practices.

---

## Prerequisites

* Terraform ≥ 1.13.3 (required for S3-native locking)
* Node.js 20+
* AWS CLI configured
* Auth0 Management API credentials for each environment (dev, qa, val, prod)
* Azure DevOps org with Pipelines and Environments
* GitHub repository connected to Azure DevOps

---

## Architecture Overview

**Pipeline Strategy:**
- **CI Pipeline** (`azure-pipelines-ci.yml`): Validates PRs and branches - builds, tests, security scans
- **CD Pipeline** (`azure-pipelines-cd.yml`): Deploys to all environments with progressive approvals
- **GitHub Flow**: Feature branches → PR → master → auto-deploy

**Environments:**
- **DEV** (`na-dev-axon-cic`): Auto-deploy, rapid iteration
- **QA** (`na-qa-axon-cic`): Optional approval, automated testing
- **VAL** (`na-val-axon-cic`): Required approval, business validation
- **PROD** (`na-prod-axon-cic`): Strict approvals, separated init/plan/apply steps

---

## Phase 1 — AWS S3 Backend Setup (One-Time)

### 1.1 Create S3 Buckets

Create **separate S3 buckets per environment**. Enable **versioning** and **encryption** for each.

### 1.2 Backend Configuration

Update backend configuration in each environment directory:

**`environments/dev/backend.tf`:**
```hcl
terraform {
  backend "s3" {
    bucket       = "axon-tf-state-na-cic-{env}"
    key          = "terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
```

Repeat for **qa**, **val**, and **prod** with respective bucket names.

### 1.3 IAM Permissions

Ensure AWS credentials have these permissions for their respective environment buckets:

**Best Practice:** Use separate AWS IAM users or roles per environment for production isolation.

---

## Phase 2 — Auth0 Setup

### 2.1 Auth0 M2M Applications (per environment)

For each environment:

* Auth0 Dashboard → Applications → Create Application → **Machine to Machine**
* Authorize **Auth0 Management API**
* Grant required scopes (at minimum):
  * clients, client_grants, connections: read/create/update/delete
  * branding: read/update
  * prompts: read/update
  * actions: read/create/update/delete
  * attack_protection: read/update
  * log_streams: read/create/update/delete
* Record Domain, Client ID, Client Secret

### 2.2 Tenant Naming Convention

Based on pattern `na-dev-axon-cic`:

| Environment | Tenant Domain |
|-------------|--------------|
| DEV | `na-dev-axon-cic.us.auth0.com` |
| QA | `na-qa-axon-cic.us.auth0.com` |
| VAL | `na-val-axon-cic.us.auth0.com` |
| PROD | `na-axon-cic.us.auth0.com` |

### 2.3 Environment Variable Files

Create non-committed `*.tfvars.json` files per environment:

```bash
cp environments/dev/dev.platform.tfvars.example environments/dev/dev.platform.tfvars.json
```

Example `dev.platform.tfvars.json`:
```json
{
  "environment": "dev",
  "app_callbacks": [
    "https://dev-app.yourcompany.com/callback"
  ]
}
```

Ensure `*.tfvars` and `*.tfvars.json` are `.gitignore`d.

---

## Phase 3 — Azure DevOps Configuration

### 3.1 Variable Groups

Create in **Pipelines → Library**.

**terraform-common-axon-cic** (Shared):
```
TF_VERSION = 1.13.3
NODE_VERSION = 20.x
```

**na-dev-axon-cic**:
```
AUTH0_DOMAIN = na-dev-axon-cic.us.auth0.com
AUTH0_CLIENT_ID = <dev_client_id>             # mark as secret
AUTH0_CLIENT_SECRET = <dev_client_secret>     # mark as secret
AWS_ACCESS_KEY_ID = <aws_access_key>          # mark as secret
AWS_SECRET_ACCESS_KEY = <aws_secret_key>      # mark as secret
AWS_DEFAULT_REGION = us-east-1
TF_STATE_BUCKET = terraform-state-axon-cic-dev
app_callbacks = https://dev-app.yourcompany.com/callback,https://dev-app.yourcompany.com/silent-callback
ENVIRONMENT_NAME = na-dev-axon-cic
```

Repeat for **na-qa-axon-cic**, **na-val-axon-cic**, and **na-prod-axon-cic** with respective values.

**Note:** AWS credentials are stored in variable groups (not service connections). Consider migrating to Azure Key Vault for enhanced security.

### 3.2 Environments and Approvals

Create Azure DevOps **Environments**:

* `na-dev-axon-cic` - No approval (auto-deploy)
* `na-qa-axon-cic` - Optional approval
* `na-val-axon-cic` - Required: 1 technical lead approver
* `na-prod-axon-cic` - **Required: 2 approvers (tech lead + ops), business hours enforcement**

For `na-prod-axon-cic`, configure:
- Approvals and checks → Add Approval
- Minimum 2 approvers
- Timeout: 7 days
- Optional: Business hours restriction

### 3.3 GitHub Branch Protection

In GitHub: **Settings → Branches → Add rule** for `master`:

```
☑ Require a pull request before merging
  ☑ Require approvals: 2
  ☑ Dismiss stale pull request approvals when new commits are pushed

☑ Require status checks to pass before merging
  ☑ Require branches to be up to date before merging
  Required: azure-pipelines-ci (Build, SecurityScan, Validate stages)

☑ Require conversation resolution before merging

☑ Do not allow bypassing the above settings

☑ Restrict who can push to matching branches (DevOps team only)
```

### 3.4 Pipelines

Create two pipelines:

1. **CI Pipeline**: Pipelines → New → `azure-pipelines-ci.yml`
2. **CD Pipeline**: Pipelines → New → `azure-pipelines-cd.yml`

---

## Phase 4 — Local Validation (DEV First)

### 4.1 Verify Terraform Version

```bash
terraform version
# Should be >= 1.13.3
```

### 4.2 Export Credentials (DEV)

```bash
export AUTH0_DOMAIN="na-dev-axon-cic.us.auth0.com"
export AUTH0_CLIENT_ID="your_dev_client_id"
export AUTH0_CLIENT_SECRET="your_dev_client_secret"
export AWS_ACCESS_KEY_ID="your_dev_aws_key"
export AWS_SECRET_ACCESS_KEY="your_dev_aws_secret"
export AWS_DEFAULT_REGION="us-east-1"
```

### 4.3 Build and Test Actions

```bash
cd actions
npm ci
npm run build
npm test
```

### 4.4 Initialize and Plan

```bash
cd ../environments/dev
terraform init \
  -backend-config="bucket=terraform-state-axon-cic-dev" \
  -backend-config="key=terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="use_lockfile=true" \
  -backend-config="encrypt=true"

terraform plan -var-file=dev.platform.tfvars.json
```

Validate planned resources (tenant, branding, connections, actions, trigger bindings, attack protection).

### 4.5 Apply to DEV

```bash
terraform apply -var-file=dev.platform.tfvars.json
```

Lock file appears during apply: `terraform.tfstate.tflock` in S3 bucket.

### 4.6 Verify in Auth0

* Branding: Universal Login reflects colors/logo
* Connections: Passwordless email exists and enabled
* Actions: Custom action present, deployed, bound to Login flow
* Attack Protection: Policies enabled
* Applications: Sample app exists if configured

---

## Phase 5 — CI/CD Pipeline Execution

### 5.1 Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/add-mfa-enforcement

# 2. Make changes, test locally in DEV
cd environments/dev
terraform plan -var-file=dev.platform.tfvars.json
terraform apply -var-file=dev.platform.tfvars.json

# 3. Commit and push
git add .
git commit -m "feat: add MFA enforcement action"
git push origin feature/add-mfa-enforcement

# 4. Create Pull Request
# CI Pipeline runs automatically:
#   ✓ Build Actions
#   ✓ Run Tests  
#   ✓ Security Scan (Checkov, TFSec)
#   ✓ Validate Terraform (all environments)
#   ✓ Generate plan preview

# 5. Get 2 approvals, merge to master

# 6. CD Pipeline triggers automatically
#   ✓ Deploy DEV (automatic)
#   ✓ Deploy QA (automatic or approval)
#   ⏸ Deploy VAL (approval required)
#   ⏸ Deploy PROD (2 approvals required)
```

### 5.2 First Pipeline Run

```bash
git add azure-pipelines-ci.yml azure-pipelines-cd.yml
git commit -m "ci: add separated CI/CD pipelines"
git push origin master
```

**CD Pipeline Stages:**
1. BuildArtifacts: Compile TypeScript actions
2. DeployDev: Automatic deployment
3. DeployQA: Automatic (or wait for approval)
4. DeployVal: Wait for 1 approval
5. DeployProd: Wait for 2 approvals (separate init/plan/apply steps)

### 5.3 Production Deployment Process

When PROD stage reaches approval gate:

1. Download `prod-plan.txt` artifact and review
2. Verify DEV, QA, VAL deployments succeeded
3. Confirm changes match expectations
4. Approve with 2 reviewers
5. Monitor apply step execution
6. Verify PROD tenant functionality

### 5.4 Post-Deployment Verification

```bash
# Download outputs from pipeline artifacts
# OR run locally:
cd environments/prod
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
terraform output -json
```

Verify in Auth0 Dashboard:
- Login flow works
- Actions execute correctly
- No errors in logs
- Applications authenticate successfully

---

## Operations

### Local Dev Loop

```bash
# Modify modules or actions
# Test in DEV locally
terraform plan -var-file=dev.platform.tfvars.json
terraform apply -var-file=dev.platform.tfvars.json
# Create PR to trigger CI/CD
```

### Adding or Updating Actions

* Implement TypeScript action and tests in `actions/`
* `npm test && npm run build`
* Update Terraform modules and apply to DEV
* Push and create PR to deploy through pipeline

### Rollbacks

**Preferred Method (Revert and Redeploy):**
```bash
git revert <commit-hash>
git push origin master
# CD pipeline redeploys automatically
```

**Emergency Manual Rollback (PROD Only):**
```bash
git checkout <last-good-commit>
cd environments/prod
# Export credentials
terraform init
terraform apply -var-file=prod.platform.tfvars.json
# Document in incident report
```

**Targeted Rollback:**
```bash
terraform taint module.problematic_action.auth0_action.this
# OR
terraform destroy -target=module.problematic_action.auth0_action.this
terraform apply -var-file=prod.platform.tfvars.json
```

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

Confirm no concurrent runs, then inspect S3 for `.tflock`:

```bash
aws s3 ls s3://terraform-state-axon-cic-dev/terraform.tfstate.tflock

# If stale (confirmed no active runs):
aws s3 rm s3://terraform-state-axon-cic-dev/terraform.tfstate.tflock
```

### AWS credentials error in pipeline

* Verify variable group has `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` marked as secret
* Test credentials locally:
  ```bash
  aws sts get-caller-identity
  ```
* Check IAM policy has required S3 permissions
* Verify `TF_STATE_BUCKET` variable matches actual bucket name

### Versioning not enabled

```bash
aws s3api put-bucket-versioning \
  --bucket terraform-state-axon-cic-prod \
  --versioning-configuration Status=Enabled
```

### Terraform version mismatch

Upgrade to ≥ 1.13.3 and re-run `terraform init`.

### Pipeline not triggering

**CI Pipeline not running on PR:**
- Verify GitHub-Azure DevOps connection
- Check trigger paths in YAML match changed files
- Ensure branch protection requires CI status checks

**CD Pipeline not running on merge:**
- Verify `azure-pipelines-cd.yml` trigger includes `master` branch
- Check pipeline is not disabled
- Review path filters

### Action not enforcing verified email

* Confirm action exists, is deployed, and bound to Login flow
* Inspect state:
  ```bash
  terraform state show module.verified_email_action.auth0_action.post_login
  terraform state show module.verified_email_action.auth0_trigger_actions.login
  ```
* Check Auth0 logs for action execution errors

---

## Security Checklist

* `*.tfvars` and `*.tfvars.json` with secrets excluded via `.gitignore`
* All secrets marked as secret in Azure DevOps variable groups
* S3 buckets: encryption enabled, versioning enabled, public access blocked
* Separate S3 buckets per environment
* Manual approval gates for VAL and PROD (2 approvers for PROD)
* Least-privilege IAM for S3 state (preferably separate AWS accounts per environment)
* No hardcoded secrets in code or committed to repository
* GitHub branch protection with required reviews and status checks
* Separated CI/CD pipelines (separation of concerns)

---

## Performance Tips

* **Pipeline caching**: npm packages cached automatically in CI pipeline
* **Local testing**: Use `terraform init -backend=false` for faster iteration
* **Path filters**: Only relevant paths trigger pipelines (actions/**, modules/**, environments/**)
* **Parallel validation**: CI pipeline validates all environments in parallel

---

## Next Steps

* Set up drift detection (scheduled pipeline)
* Document runbooks for common operational tasks
* Prepare incident response plan

---

## References

* [Terraform Auth0 Provider](https://registry.terraform.io/providers/auth0/auth0/latest/docs)
* [Auth0 Management API](https://auth0.com/docs/api/management/v2)
* [Terraform S3 Backend (S3-native locking)](https://developer.hashicorp.com/terraform/language/backend/s3)

---

## Support

* Check Terraform state for resource drift
* Internal DevOps team for pipeline and infrastructure questions