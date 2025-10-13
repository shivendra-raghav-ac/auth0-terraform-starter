# ========================================
# Auth0 Actions Module
# ========================================
# Manages Auth0 Actions with TypeScript build detection
# Automatically rebuilds when source files change

# ========================================
# Build Trigger
# ========================================

resource "terraform_data" "action_build_trigger" {
  triggers_replace = {
    # Hash the TS source file to detect changes
    source_hash = fileexists("${path.root}/../../actions/src/post-login-action.ts") ? filemd5("${path.root}/../../actions/src/post-login-action.ts") : "initial"

    # Hash package.json in case dependencies change
    package_hash = fileexists("${path.root}/../../actions/package.json") ? filemd5("${path.root}/../../actions/package.json") : "initial"

    # Hash the built JS to ensure it exists and is current
    build_hash = fileexists(var.action_js_path) ? filemd5(var.action_js_path) : "missing"
  }

  lifecycle {
    precondition {
      condition     = fileexists(var.action_js_path)
      error_message = "Action JS file not found at ${var.action_js_path}. Run 'npm run build' in actions/ directory."
    }
  }
}

# ========================================
# Action Resource
# ========================================

resource "auth0_action" "post_login" {
  name    = var.action_name
  runtime = "node18"
  deploy  = var.deploy
  code    = file(var.action_js_path)

  supported_triggers {
    id      = "post-login"
    version = "v3"
  }

  depends_on = [terraform_data.action_build_trigger]
}

# ========================================
# Trigger Binding
# ========================================

resource "auth0_trigger_actions" "bind_post_login" {
  count   = var.bind_to_post_login ? 1 : 0
  trigger = "post-login"

  actions {
    id           = auth0_action.post_login.id
    display_name = var.action_name
  }

  depends_on = [auth0_action.post_login]
}