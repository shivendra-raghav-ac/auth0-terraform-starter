/**
 * ============================================================================
 * Auth0 Post-Login Action: Progressive Profiling (Screen-Based)
 * ============================================================================
 *
 * Architecture:
 *   - Screen-based registry: each "screen" is a pre-built Form step with fixed
 *     required/optional fields. The Action picks which screens to show.
 *   - Delta-based completeness: only interrupts login when REQUIRED data is
 *     missing. Optional fields piggyback on blocking interruptions.
 *   - Metadata separation:
 *       user_metadata.profile  → profile fields (user-editable, shared across apps)
 *       app_metadata.consents  → consent state (admin-only, audit-sensitive)
 *
 * Auth0 Forms constraint:
 *   OOB form components cannot toggle required/optional at runtime.
 *   Each screen is a fixed layout in the Form builder. The Action controls
 *   WHICH screens appear via router variables, not how they behave.
 *
 * Form contract (Action → Form via fields):
 *   pp_screen_1, pp_screen_2, pp_screen_3  → screen IDs or '' if unused
 *   pp_policy_key, consent_bundle_key       → audit context
 *   first_name, last_name, marketing_status → prefill values
 *
 * Form router logic:
 *   Start → if pp_screen_1 != '' → go to screen matching pp_screen_1
 *         → after screen 1, if pp_screen_2 != '' → go to screen matching pp_screen_2
 *         → after screen 2, if pp_screen_3 != '' → go to screen matching pp_screen_3
 *         → else → submit
 *
 * Security:
 *   - Hard fail on misconfigured policy/bundle (no silent fallbacks)
 *   - Server-side validation in onContinuePostLogin (never trust form input)
 *   - Input sanitization (trim, length limits, type coercion)
 *   - Consent records include timestamps, source, policy_key, bundle_key
 *
 * Adding a new app:
 *   1. Define or reuse a policy in POLICIES (pick which screens to show)
 *   2. Set client_metadata on the app: pp_enabled, pp_policy_key, consent_bundle_key
 *   3. If a new screen type is needed: build it in the Form, add a SCREEN_CHECK
 *
 * ============================================================================
 */

import type { Event, PostLoginAPI } from '@auth0/actions/post-login/v3';

// ============================================================================
// Types
// ============================================================================

/** Screen IDs correspond to pre-built screens in the Auth0 Form builder. */
type ScreenId =
  | 'basic_first_only'                            // first_name required, no last_name
  | 'basic_first_required_last_optional'           // first_name required, last_name shown but skippable
  | 'basic_first_last_required'                    // both required
  | 'consent_legal_required'                       // legal only, required
  | 'consent_legal_required_marketing_optional';   // legal required + marketing opt-in/out shown

type Policy = {
  policyKey: string;
  formVariant: string;
  screens: ScreenId[];
};

type ConsentBundle = {
  bundleKey: string;
  // Future: collection_point_guid, purpose_ids[], etc.
  // These map to OneTrust config when you integrate.
};

type ConsentRecord = {
  accepted: boolean;
  accepted_at: string;
  bundle_key: string;
  policy_key: string;
  source: string;
};

type MarketingRecord = {
  status: 'opt_in' | 'opt_out';
  updated_at: string;
  bundle_key: string;
  policy_key: string;
  source: string;
};

type UserProfile = {
  first_name: string | undefined;
  last_name: string | undefined;
};

type UserConsents = {
  legal: Partial<ConsentRecord>;
  marketing: Partial<MarketingRecord>;
};

// ============================================================================
// Constants & Limits
// ============================================================================

/** Max characters for a profile field value. Prevents abuse via oversized input. */
const MAX_FIELD_LENGTH = 255;

/** Max screens the Form supports (router has finite depth). */
const MAX_SCREENS = 3;

/** Consent source identifier for audit trail. */
const CONSENT_SOURCE = 'auth0_pp_form';

// ============================================================================
// Registry: Forms
// ============================================================================

/**
 * Maps form variant names to Auth0 Form IDs.
 * You get the form ID from the Auth0 dashboard after creating the Form.
 */
const FORMS: Record<string, { formId: string }> = {
  pp_universal: { formId: 'ap_REPLACE_WITH_YOUR_FORM_ID' },
};

// ============================================================================
// Registry: Policies
// ============================================================================

/**
 * Each policy defines which pre-built screens to show.
 * Screens are evaluated in order; the Action skips any that are already satisfied.
 *
 * Naming convention: pp.<app_or_group>.<version>
 *
 * To add an app:
 *   - Reuse an existing policy if requirements match (most apps will share one).
 *   - Create a new policy only if the screen combination is genuinely new.
 */
const POLICIES: Record<string, Policy> = {
  // App1: first_name required, last_name optional, legal required, marketing optional
  'pp.standard.v1': {
    policyKey: 'pp.standard.v1',
    formVariant: 'pp_universal',
    screens: [
      'basic_first_required_last_optional',
      'consent_legal_required_marketing_optional',
    ],
  },

  // App2 variant: first + last required, legal required, no marketing
  'pp.strict_profile.v1': {
    policyKey: 'pp.strict_profile.v1',
    formVariant: 'pp_universal',
    screens: [
      'basic_first_last_required',
      'consent_legal_required',
    ],
  },

  // App3 variant: profile only, no consent
  'pp.profile_only.v1': {
    policyKey: 'pp.profile_only.v1',
    formVariant: 'pp_universal',
    screens: [
      'basic_first_required_last_optional',
    ],
  },
};

// ============================================================================
// Registry: Consent Bundles
// ============================================================================

/**
 * Maps bundle keys to OneTrust config.
 * Stub for now; expand when integrating OneTrust.
 *
 * Version bumps (v7 → v8) when:
 *   - Collection point changes
 *   - Purpose set changes (add/remove)
 *   - Policy text changes requiring re-acceptance
 */
const CONSENT_BUNDLES: Record<string, ConsentBundle> = {
  'ot.bundle.global.v7': {
    bundleKey: 'ot.bundle.global.v7',
    // Future:
    // collection_point_guid: '...',
    // purposes: ['legal_notice', 'marketing_email'],
  },
};

// ============================================================================
// Screen Completeness Checks
// ============================================================================

/**
 * Each screen check answers: "Is this screen's REQUIRED data already satisfied?"
 * If true, the screen is skipped. If false, it must be shown.
 *
 * Optional fields (last_name, marketing) do NOT block — they are only shown
 * when the user is already being interrupted for a required field.
 */
type ScreenCheckFn = (profile: UserProfile, consents: UserConsents, bundleKey: string) => boolean;

const SCREEN_CHECKS: Record<ScreenId, ScreenCheckFn> = {
  basic_first_only: (profile) => {
    return !isBlank(profile.first_name);
  },

  basic_first_required_last_optional: (profile) => {
    // Only first_name is blocking; last_name is optional
    return !isBlank(profile.first_name);
  },

  basic_first_last_required: (profile) => {
    return !isBlank(profile.first_name) && !isBlank(profile.last_name);
  },

  consent_legal_required: (_profile, consents, bundleKey) => {
    return isLegalSatisfied(consents, bundleKey);
  },

  consent_legal_required_marketing_optional: (_profile, consents, bundleKey) => {
    // Only legal is blocking; marketing is optional
    return isLegalSatisfied(consents, bundleKey);
  },
};

// ============================================================================
// Screen Validation (server-side, in onContinuePostLogin)
// ============================================================================

/**
 * Validates form submission data for each screen.
 * Returns an error message if validation fails, or null if valid.
 *
 * SECURITY: Never trust form input. Always re-validate server-side.
 */
type ScreenValidateFn = (fields: Record<string, unknown>) => string | null;

const SCREEN_VALIDATORS: Record<ScreenId, ScreenValidateFn> = {
  basic_first_only: (fields) => {
    if (isBlank(fields.first_name)) return 'First name is required.';
    if (!isValidName(fields.first_name)) return 'First name contains invalid characters.';
    return null;
  },

  basic_first_required_last_optional: (fields) => {
    if (isBlank(fields.first_name)) return 'First name is required.';
    if (!isValidName(fields.first_name)) return 'First name contains invalid characters.';
    if (!isBlank(fields.last_name) && !isValidName(fields.last_name)) {
      return 'Last name contains invalid characters.';
    }
    return null;
  },

  basic_first_last_required: (fields) => {
    if (isBlank(fields.first_name)) return 'First name is required.';
    if (isBlank(fields.last_name)) return 'Last name is required.';
    if (!isValidName(fields.first_name)) return 'First name contains invalid characters.';
    if (!isValidName(fields.last_name)) return 'Last name contains invalid characters.';
    return null;
  },

  consent_legal_required: (fields) => {
    if (!isTruthy(fields.legal_accept)) return 'You must accept the policy to continue.';
    return null;
  },

  consent_legal_required_marketing_optional: (fields) => {
    if (!isTruthy(fields.legal_accept)) return 'You must accept the policy to continue.';
    // marketing_status is optional; no validation needed
    return null;
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

function isBlank(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

function isTruthy(v: unknown): boolean {
  return v === true || v === 'true' || v === 'yes' || v === '1';
}

/**
 * Basic name validation: allows letters, spaces, hyphens, apostrophes, periods.
 * Rejects control characters, HTML, script injection attempts.
 * Enforces length limit.
 */
function isValidName(v: unknown): boolean {
  if (typeof v !== 'string') return false;
  const trimmed = v.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_FIELD_LENGTH) return false;
  // Allow unicode letters, spaces, hyphens, apostrophes, periods
  // Reject angle brackets, script tags, control chars
  if (/[<>{}\\]/.test(trimmed)) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(trimmed)) return false;
  return true;
}

/**
 * Sanitize a string field: trim whitespace, enforce max length.
 */
function sanitizeString(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, MAX_FIELD_LENGTH);
}

function nowIso(): string {
  return new Date().toISOString();
}

function isLegalSatisfied(consents: UserConsents, bundleKey: string): boolean {
  return consents.legal?.accepted === true && consents.legal?.bundle_key === bundleKey;
}

function getMarketingStatus(consents: UserConsents): 'opt_in' | 'opt_out' | 'unset' {
  const s = consents.marketing?.status;
  if (s === 'opt_in' || s === 'opt_out') return s;
  return 'unset';
}

// ============================================================================
// Event Data Extraction
// ============================================================================

function getClientMeta(event: Event, key: string): string | undefined {
  return event.client?.metadata?.[key];
}

function getUserProfile(event: Event): UserProfile {
  const um = event.user.user_metadata ?? {};
  const p = (um as Record<string, unknown>).profile ?? {};
  const profile = p as Record<string, unknown>;
  return {
    first_name: typeof profile.first_name === 'string' ? profile.first_name : undefined,
    last_name: typeof profile.last_name === 'string' ? profile.last_name : undefined,
  };
}

function getUserConsents(event: Event): UserConsents {
  const am = event.user.app_metadata ?? {};
  const c = (am as Record<string, unknown>).consents ?? {};
  const consents = c as Record<string, unknown>;
  return {
    legal: (consents.legal ?? {}) as Partial<ConsentRecord>,
    marketing: (consents.marketing ?? {}) as Partial<MarketingRecord>,
  };
}

// ============================================================================
// Policy & Bundle Resolution
// ============================================================================

/**
 * Resolve the policy for the current app.
 * HARD FAIL if misconfigured — silent fallbacks hide bugs.
 */
function resolvePolicy(event: Event): Policy | null {
  const key = getClientMeta(event, 'pp_policy_key');
  if (!key) return null;
  return POLICIES[key] ?? null;
}

function resolveConsentBundle(event: Event): ConsentBundle | null {
  const key = getClientMeta(event, 'consent_bundle_key');
  if (!key) return null;
  return CONSENT_BUNDLES[key] ?? null;
}

// ============================================================================
// Pending Screens Calculation
// ============================================================================

/**
 * Determine which screens still need to be shown.
 * A screen is "pending" if its completeness check returns false.
 */
function getPendingScreens(
  policy: Policy,
  profile: UserProfile,
  consents: UserConsents,
  bundleKey: string
): ScreenId[] {
  return policy.screens.filter((screenId) => {
    const check = SCREEN_CHECKS[screenId];
    if (!check) return false; // Unknown screen = skip (logged below)
    return !check(profile, consents, bundleKey);
  });
}

// ============================================================================
// Action: onExecutePostLogin
// ============================================================================

/**
 * Runs on every login. Checks if the user is missing required data
 * for the current app's policy. If so, renders the progressive profiling form.
 *
 * Only interrupts login for BLOCKING (required) fields.
 * Optional fields are shown opportunistically when already interrupting.
 */
exports.onExecutePostLogin = async (event: Event, api: PostLoginAPI) => {
  // ---- Gate: is progressive profiling enabled for this app? ----
  const ppEnabled = getClientMeta(event, 'pp_enabled');
  if (ppEnabled !== 'true') return;

  // ---- Resolve policy ----
  const policy = resolvePolicy(event);
  if (!policy) {
    console.error(`[PP] Invalid pp_policy_key: "${getClientMeta(event, 'pp_policy_key')}"`);
    api.access.deny('Application configuration error. Please contact support. [PP_POLICY]');
    return;
  }

  // ---- Resolve form ----
  const formConfig = FORMS[policy.formVariant];
  if (!formConfig) {
    console.error(`[PP] Invalid form variant: "${policy.formVariant}"`);
    api.access.deny('Application configuration error. Please contact support. [PP_FORM]');
    return;
  }

  // ---- Resolve consent bundle (required if policy includes consent screens) ----
  const hasConsentScreen = policy.screens.some((s) => s.startsWith('consent_'));
  const bundle = resolveConsentBundle(event);

  if (hasConsentScreen && !bundle) {
    console.error(`[PP] consent_bundle_key required but missing/invalid: "${getClientMeta(event, 'consent_bundle_key')}"`);
    api.access.deny('Application configuration error. Please contact support. [PP_BUNDLE]');
    return;
  }

  const bundleKey = bundle?.bundleKey ?? '';

  // ---- Gather current user state ----
  const profile = getUserProfile(event);
  const consents = getUserConsents(event);

  // ---- Determine which screens are still pending ----
  const pendingScreens = getPendingScreens(policy, profile, consents, bundleKey);

  if (pendingScreens.length === 0) {
    // All required data is present. Do not interrupt login.
    return;
  }

  if (pendingScreens.length > MAX_SCREENS) {
    console.error(`[PP] Too many pending screens (${pendingScreens.length}). Max is ${MAX_SCREENS}.`);
    // Still render the first MAX_SCREENS; log the issue for ops.
  }

  // ---- Build form fields ----
  const marketingStatus = getMarketingStatus(consents);

  const fields: Record<string, string> = {
    // Screen routing (Form router reads these)
    pp_screen_1: pendingScreens[0] ?? '',
    pp_screen_2: pendingScreens[1] ?? '',
    pp_screen_3: pendingScreens[2] ?? '',

    // Audit context (passed through to onContinuePostLogin via form)
    pp_policy_key: policy.policyKey,
    consent_bundle_key: bundleKey,

    // Prefill values (so user doesn't re-enter existing data)
    first_name: profile.first_name ?? '',
    last_name: profile.last_name ?? '',
    marketing_status: marketingStatus,
  };

  // ---- Render the form ----
  api.prompt.render(formConfig.formId, { fields });
};

// ============================================================================
// Action: onContinuePostLogin
// ============================================================================

/**
 * Runs after the Form is submitted and the login transaction resumes.
 * Validates all submitted data server-side, then persists to metadata.
 *
 * SECURITY:
 *   - Re-derives which screens were pending (same logic as onExecute).
 *   - Validates every required field for those screens.
 *   - Sanitizes all string inputs before writing to metadata.
 *   - Never trusts client-submitted data without validation.
 */
exports.onContinuePostLogin = async (event: Event, api: PostLoginAPI) => {
  // ---- Gate ----
  const ppEnabled = getClientMeta(event, 'pp_enabled');
  if (ppEnabled !== 'true') return;

  // ---- Resolve policy & bundle ----
  const policy = resolvePolicy(event);
  if (!policy) {
    api.access.deny('Application configuration error. Please contact support. [PP_POLICY]');
    return;
  }

  const hasConsentScreen = policy.screens.some((s) => s.startsWith('consent_'));
  const bundle = resolveConsentBundle(event);
  if (hasConsentScreen && !bundle) {
    api.access.deny('Application configuration error. Please contact support. [PP_BUNDLE]');
    return;
  }
  const bundleKey = bundle?.bundleKey ?? '';

  // ---- Gather current user state (pre-form) ----
  const profile = getUserProfile(event);
  const consents = getUserConsents(event);

  // ---- Re-derive pending screens (must match onExecute logic) ----
  const pendingScreens = getPendingScreens(policy, profile, consents, bundleKey);

  // ---- Extract form fields ----
  const formFields = ((event as Record<string, unknown>).prompt as Record<string, unknown>)?.fields ?? {};
  const fields = formFields as Record<string, unknown>;

  // ---- Validate each pending screen ----
  for (const screenId of pendingScreens.slice(0, MAX_SCREENS)) {
    const validator = SCREEN_VALIDATORS[screenId];
    if (!validator) continue;

    const error = validator(fields);
    if (error) {
      api.access.deny(error);
      return;
    }
  }

  // ---- Persist: profile fields → user_metadata.profile ----
  const existingProfile = (
    (event.user.user_metadata ?? {}) as Record<string, unknown>
  ).profile ?? {};
  const currentProfile = existingProfile as Record<string, unknown>;

  const profileUpdate: Record<string, string> = { ...currentProfile } as Record<string, string>;

  const firstName = sanitizeString(fields.first_name);
  const lastName = sanitizeString(fields.last_name);

  if (firstName) profileUpdate.first_name = firstName;
  if (lastName) profileUpdate.last_name = lastName;
  // NOTE: if last_name is blank and optional, we do NOT write it.
  // Absence = "never provided." This is the convention.

  api.user.setUserMetadata('profile', profileUpdate);

  // ---- Persist: consent → app_metadata.consents ----
  const existingConsents = (
    (event.user.app_metadata ?? {}) as Record<string, unknown>
  ).consents ?? {};
  const currentConsents = { ...(existingConsents as Record<string, unknown>) };

  const ts = nowIso();

  // Legal consent (only write if a consent screen was pending)
  const legalScreenPending = pendingScreens.some((s) => s.startsWith('consent_'));
  if (legalScreenPending && isTruthy(fields.legal_accept)) {
    currentConsents.legal = {
      accepted: true,
      accepted_at: ts,
      bundle_key: bundleKey,
      policy_key: policy.policyKey,
      source: CONSENT_SOURCE,
      // Future: receipt_id from OneTrust integration
    } satisfies ConsentRecord;
  }

  // Marketing consent (only write if user made an explicit choice)
  const marketingStatus = fields.marketing_status;
  if (marketingStatus === 'opt_in' || marketingStatus === 'opt_out') {
    currentConsents.marketing = {
      status: marketingStatus,
      updated_at: ts,
      bundle_key: bundleKey,
      policy_key: policy.policyKey,
      source: CONSENT_SOURCE,
    } satisfies MarketingRecord;
  }

  api.user.setAppMetadata('consents', currentConsents);
};
