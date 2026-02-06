# Progressive Profiling — Architecture

## Overview

A Post-Login Action that conditionally redirects users to a Form when required profile or consent data is missing. Designed for enterprise use across multiple applications with varying requirements.

## Core Principles

**One Form, many policies.** A single universal Form in Auth0 handles all apps. Each app points to a policy that selects which pre-built screen to show. No per-app forms.

**Screen-based, not field-based.** Auth0 Forms cannot toggle field requirements at runtime. Each unique combination of required/optional fields is a distinct screen built at design time. The Action picks the screen; it doesn't configure it.

**Delta-based interruption.** The Action only interrupts login when REQUIRED data is missing. If the user already satisfies all requirements, login proceeds silently. Optional fields piggyback on blocking interruptions — they are never a reason to interrupt on their own.

**Hard fail on misconfiguration.** If a policy key, bundle key, or form variant is invalid, the Action denies access with a coded error. Silent fallbacks hide bugs in production.

## Screen Naming Convention

```
[group]_opt_[field]__[group]_opt_[field]
```

- Groups are separated by double underscore (`__`)
- Required fields are implied by the group name and are not listed
- Optional fields are prefixed with `opt_`
- Field abbreviations: `fn` = first_name, `ln` = last_name, `mkt` = marketing

### Examples

| Screen ID | Meaning |
|---|---|
| `profile_opt_ln__consent_opt_mkt` | first_name required, last_name optional, legal required, marketing optional |
| `profile__consent` | first_name required, last_name required, legal required, marketing required |
| `profile_opt_ln__consent` | first_name required, last_name optional, legal required, marketing required |
| `profile_opt_ln` | first_name required, last_name optional, no consent |

### Group definitions

| Group | Implied required fields | Possible optional fields |
|---|---|---|
| `profile` | `first_name`, `last_name` | `ln` (last_name) |
| `consent` | `legal_accept` | `mkt` (marketing) |
| `contact` (future) | `phone` | `locale`, `timezone` |

When a group appears without any `opt_` suffix, ALL fields in that group are required.

## Data Model

### Metadata separation

| Store | Path | Contents | Why here |
|---|---|---|---|
| `user_metadata` | `.profile.first_name`, `.profile.last_name` | Profile fields | User-editable, shared across apps |
| `app_metadata` | `.consents.legal`, `.consents.marketing` | Consent state | Admin-only writable, audit-sensitive |

### Consent record shape

```json
{
  "consents": {
    "legal": {
      "accepted": true,
      "accepted_at": "2025-02-06T12:00:00.000Z",
      "bundle_key": "ot.bundle.global.v1",
      "policy_key": "pp.standard.v1",
      "source": "auth0_pp_form"
    },
    "marketing": {
      "status": "opt_in",
      "updated_at": "2025-02-06T12:00:00.000Z",
      "bundle_key": "ot.bundle.global.v1",
      "policy_key": "pp.standard.v1",
      "source": "auth0_pp_form"
    }
  }
}
```

### Field absence convention

If an optional field is skipped, it is NOT stored (no empty strings, no nulls). Presence = provided. Absence = never asked or skipped. This keeps downstream checks simple: `if (profile.last_name)` is enough.

## Application Setup

Each app sets three keys in **Application Metadata** (Settings → Advanced → Application Metadata):

| Key | Example | Required |
|---|---|---|
| `pp_enabled` | `true` | Yes |
| `pp_policy_key` | `pp.standard.v1` | Yes (if pp_enabled) |
| `consent_bundle_key` | `ot.bundle.global.v1` | Only if policy screen includes consent |

## Registries (in Action code)

### POLICIES

Maps `pp_policy_key` → which screen to show and which form to use.

```ts
'pp.standard.v1': {
  policyKey: 'pp.standard.v1',
  formVariant: 'pp_universal',
  screen: 'profile_opt_ln__consent_opt_mkt',
}
```

### CONSENT_BUNDLES

Maps `consent_bundle_key` → OneTrust config (stub for now).

```ts
'ot.bundle.global.v1': {
  bundleKey: 'ot.bundle.global.v1',
}
```

### FORMS

Maps form variant → Auth0 Form ID.

```ts
'pp_universal': { formId: 'ap_XXXX' }
```

## Action → Form Contract

The Action passes these fields to the Form via `api.prompt.render()`:

| Field | Type | Purpose |
|---|---|---|
| `pp_screen` | string | Screen ID — Form router uses this to pick the screen |
| `pp_policy_key` | string | Audit context (passed through) |
| `consent_bundle_key` | string | Audit context (passed through) |
| `first_name` | string | Prefill value |
| `last_name` | string | Prefill value |
| `marketing_status` | string | Prefill value (`opt_in`, `opt_out`, or `unset`) |

The Form submits back:

| Field | Type | Source screen |
|---|---|---|
| `first_name` | string | Profile screen |
| `last_name` | string | Profile screen (may be blank if optional) |
| `legal_accept` | boolean/string | Consent screen |
| `marketing_status` | string | Consent screen (`opt_in`, `opt_out`, or blank) |

## Form Router Logic

```
START
  │
  ▼
Router: pp_screen == "profile_opt_ln__consent_opt_mkt"
  └──→ Screen: profile_opt_ln__consent_opt_mkt
         │
         ▼
       Submit
```

When more screens are added, the router becomes:

```
START
  │
  ▼
Router
  ├── pp_screen == "profile_opt_ln__consent_opt_mkt"  → Screen A → Submit
  ├── pp_screen == "profile__consent"                  → Screen B → Submit
  ├── pp_screen == "profile_opt_ln"                    → Screen C → Submit
  └── default                                          → Submit
```

Each screen is self-contained. The router is a flat switch on `pp_screen`, not a chain.

## Security

- Server-side validation in `onContinuePostLogin` — never trust form input
- Input sanitization: trim, length cap (255 chars), reject `<>{}\\` and control characters
- Hard deny on misconfigured policy/bundle/form (coded errors: `[PP_POLICY]`, `[PP_FORM]`, `[PP_BUNDLE]`, `[PP_SCREEN]`)
- Consent timestamps use server-side `new Date().toISOString()`, not client-submitted values

## Adding a New App

1. Check if an existing policy matches the app's requirements (most will)
2. If not, define a new screen ID following the naming convention
3. Build the screen in the Auth0 Form builder
4. Add `SCREEN_CHECKS[screenId]` and `SCREEN_VALIDATORS[screenId]`
5. Add a new policy entry in `POLICIES` pointing to the screen
6. Set `client_metadata` on the app

## Adding a New Field Group (e.g., contact)

1. Define the group's implied required fields and optional fields
2. Create screen IDs: `profile_opt_ln__consent_opt_mkt__contact`, etc.
3. Build the screens in the Form
4. Add checks and validators
5. Update policies that need the new group

## OneTrust Integration Path (future)

When ready to integrate OneTrust:

1. Expand `ConsentBundle` with `collection_point_guid` and `purposes[]`
2. In the Form (or a consent gateway service), use `consent_bundle_key` to look up OneTrust config
3. Call OneTrust's Create Identified Consent Receipt endpoint
4. Store returned `receipt_id` alongside existing consent fields in `app_metadata.consents.legal`
5. Auth0 remains the fast-read cache; OneTrust becomes system of record

## File Structure

```
src/
  actions/
    post-login-progressive-profiling.ts    ← Action code
  docs/
    progressive-profiling/
      ARCHITECTURE.md                      ← This file
__tests__/
  post-login-progressive-profiling.test.ts ← Unit tests
```
