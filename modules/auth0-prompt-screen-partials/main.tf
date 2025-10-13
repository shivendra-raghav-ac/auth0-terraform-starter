
# ========================================
# Auth0 Prompt Screen Partials Module
# Inject custom HTML/CSS/JS into prompt screens
# ========================================

resource "auth0_prompt_screen_partials" "this" {
  prompt_type = var.prompt_type

  dynamic "screen_partials" {
    for_each = var.screen_partials
    content {
      screen_name = screen_partials.value.screen_name

      insertion_points {
        form_content            = lookup(screen_partials.value.insertion_points, "form_content", null)
        form_content_start      = lookup(screen_partials.value.insertion_points, "form_content_start", null)
        form_content_end        = lookup(screen_partials.value.insertion_points, "form_content_end", null)
        form_footer_start       = lookup(screen_partials.value.insertion_points, "form_footer_start", null)
        form_footer_end         = lookup(screen_partials.value.insertion_points, "form_footer_end", null)
        secondary_actions_start = lookup(screen_partials.value.insertion_points, "secondary_actions_start", null)
        secondary_actions_end   = lookup(screen_partials.value.insertion_points, "secondary_actions_end", null)
      }
    }
  }
}
