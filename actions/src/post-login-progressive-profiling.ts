/**
 * Auth0 Post-Login Action: Progressive Profiling
 *
 * See architecture doc: src/docs/progressive-profiling/ARCHITECTURE.md
 */

import type { Event, PostLoginAPI } from '@auth0/actions/post-login/v3';

// ============================================================================
// Types
// ============================================================================

/**
 * Screen Naming Convention:
 *
 *   [group]_opt_[field]__[group]_opt_[field]
 *
 *   - Groups separated by double underscore (__)
 *   - Required fields are implied by the group name (not listed)
 *   - Optional fields prefixed with opt_
 *   - Field abbreviations: fn=first_name, ln=last_name, mkt=marketing
 *
 * Examples:
 *   profile_opt_ln                          → first_name required, last_name optional
 *   profile_opt_ln__consent_opt_mkt         → profile + consent, marketing optional
 *   profile__consent                        → profile + consent, all fields required
 *   profile_opt_ln__consent_opt_mkt__contact → adds contact group later
 *
 * Each screen ID maps to a pre-built screen in the Auth0 Form builder.
 * Auth0 Forms cannot toggle required/optional at runtime — each combination
 * is a distinct screen with fields set at design time.
 */
type ScreenId =
  | 'profile_opt_ln__consent_opt_mkt';
  // Future screens — uncomment and add to SCREEN_CHECKS / SCREEN_VALIDATORS:
  // | 'profile__consent'
  // | 'profile_opt_ln__consent'
  // | 'profile_opt_ln'

type Policy = {
  policyKey: string;
  formVariant: string;
  screen: ScreenId;
};

type ConsentBundle = {
  bundleKey: string;
  // Future OneTrust integration fields:
  // collection_point_guid: string;
  // purposes: string[];
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
// Constants
// ============================================================================

const MAX_FIELD_LENGTH = 255;
const CONSENT_SOURCE = 'auth0_pp_form';

// ============================================================================
// Registry: Forms
// ============================================================================

const FORMS: Record<string, { formId: string }> = {
  pp_universal: { formId: 'ap_REPLACE_WITH_YOUR_FORM_ID' },
};

// ============================================================================
// Registry: Policies
// ============================================================================

const POLICIES: Record<string, Policy> = {
  'pp.standard.v1': {
    policyKey: 'pp.standard.v1',
    formVariant: 'pp_universal',
    screen: 'profile_opt_ln__consent_opt_mkt',
  },
  // Future policies:
  // 'pp.strict_profile.v1': {
  //   policyKey: 'pp.strict_profile.v1',
  //   formVariant: 'pp_universal',
  //   screen: 'profile__consent',
  // },
};

// ============================================================================
// Registry: Consent Bundles
// ============================================================================

const CONSENT_BUNDLES: Record<string, ConsentBundle> = {
  'ot.bundle.global.v1': {
    bundleKey: 'ot.bundle.global.v1',
  },
};

// ============================================================================
// Screen Completeness Checks
// ============================================================================

/**
 * Returns true if the screen's REQUIRED data is already satisfied.
 * Optional fields never block — they're shown opportunistically.
 */
type ScreenCheckFn = (
  profile: UserProfile,
  consents: UserConsents,
  bundleKey: string
) => boolean;

const SCREEN_CHECKS: Record<ScreenId, ScreenCheckFn> = {
  'profile_opt_ln__consent_opt_mkt': (profile, consents, bundleKey) => {
    const hasFirstName = !isBlank(profile.first_name);
    const hasLegal = isLegalSatisfied(consents, bundleKey);
    return hasFirstName && hasLegal;
  },
};

// ============================================================================
// Screen Validation (server-side, onContinuePostLogin)
// ============================================================================

/**
 * Validates form submission. Returns error message or null if valid.
 * SECURITY: Never trust form input. Always re-validate server-side.
 */
type ScreenValidateFn = (fields: Record<string, unknown>) => string | null;

const SCREEN_VALIDATORS: Record<ScreenId, ScreenValidateFn> = {
  'profile_opt_ln__consent_opt_mkt': (fields) => {
    if (isBlank(fields.first_name)) return 'First name is required.';
    if (!isValidName(fields.first_name)) return 'First name contains invalid characters.';
    if (!isBlank(fields.last_name) && !isValidName(fields.last_name)) {
      return 'Last name contains invalid characters.';
    }
    if (!isTruthy(fields.legal_accept)) return 'You must accept the policy to continue.';
    return null;
  },
};

// ============================================================================
// Utilities
// ============================================================================

export function isBlank(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

export function isTruthy(v: unknown): boolean {
  return v === true || v === 'true' || v === 'yes' || v === '1';
}

/**
 * Name validation: allows unicode letters, spaces, hyphens, apostrophes, periods.
 * Rejects control characters, angle brackets, braces, backslashes.
 */
export function isValidName(v: unknown): boolean {
  if (typeof v !== 'string') return false;
  const trimmed = v.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_FIELD_LENGTH) return false;
  if (/[<>{}\\]/.test(trimmed)) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(trimmed)) return false;
  return true;
}

export function sanitizeString(v: unknown): string {
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

export function getClientMeta(event: Event, key: string): string | undefined {
  return event.client?.metadata?.[key];
}

export function getUserProfile(event: Event): UserProfile {
  const um = event.user.user_metadata ?? {};
  const p = (um as Record<string, unknown>).profile ?? {};
  const profile = p as Record<string, unknown>;
  return {
    first_name: typeof profile.first_name === 'string' ? profile.first_name : undefined,
    last_name: typeof profile.last_name === 'string' ? profile.last_name : undefined,
  };
}

export function getUserConsents(event: Event): UserConsents {
  const am = event.user.app_metadata ?? {};
  const c = (am as Record<string, unknown>).consents ?? {};
  const consents = c as Record<string, unknown>;
  return {
    legal: (consents.legal ?? {}) as Partial<ConsentRecord>,
    marketing: (consents.marketing ?? {}) as Partial<MarketingRecord>,
  };
}

// ============================================================================
// Resolution
// ============================================================================

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
// Action: onExecutePostLogin
// ============================================================================

exports.onExecutePostLogin = async (event: Event, api: PostLoginAPI) => {
  // Gate
  if (getClientMeta(event, 'pp_enabled') !== 'true') return;

  // Resolve policy
  const policy = resolvePolicy(event);
  if (!policy) {
    console.error(`[PP] Invalid pp_policy_key: "${getClientMeta(event, 'pp_policy_key')}"`);
    api.access.deny('Application configuration error. Contact support. [PP_POLICY]');
    return;
  }

  // Resolve form
  const formConfig = FORMS[policy.formVariant];
  if (!formConfig) {
    console.error(`[PP] Invalid form variant: "${policy.formVariant}"`);
    api.access.deny('Application configuration error. Contact support. [PP_FORM]');
    return;
  }

  // Resolve consent bundle (required if screen includes consent)
  const screenHasConsent = policy.screen.includes('__consent');
  const bundle = resolveConsentBundle(event);
  if (screenHasConsent && !bundle) {
    console.error(`[PP] consent_bundle_key required but invalid: "${getClientMeta(event, 'consent_bundle_key')}"`);
    api.access.deny('Application configuration error. Contact support. [PP_BUNDLE]');
    return;
  }
  const bundleKey = bundle?.bundleKey ?? '';

  // Current user state
  const profile = getUserProfile(event);
  const consents = getUserConsents(event);

  // Completeness check — is the screen already satisfied?
  const check = SCREEN_CHECKS[policy.screen];
  if (!check) {
    console.error(`[PP] No completeness check for screen: "${policy.screen}"`);
    api.access.deny('Application configuration error. Contact support. [PP_SCREEN]');
    return;
  }

  if (check(profile, consents, bundleKey)) {
    // All required data present. Do not interrupt login.
    return;
  }

  // Render form
  api.prompt.render(formConfig.formId, {
    fields: {
      pp_screen: policy.screen,
      pp_policy_key: policy.policyKey,
      consent_bundle_key: bundleKey,
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
      marketing_status: getMarketingStatus(consents),
    },
  });
};

// ============================================================================
// Action: onContinuePostLogin
// ============================================================================

exports.onContinuePostLogin = async (event: Event, api: PostLoginAPI) => {
  // Gate
  if (getClientMeta(event, 'pp_enabled') !== 'true') return;

  // Resolve policy & bundle
  const policy = resolvePolicy(event);
  if (!policy) {
    api.access.deny('Application configuration error. Contact support. [PP_POLICY]');
    return;
  }

  const screenHasConsent = policy.screen.includes('__consent');
  const bundle = resolveConsentBundle(event);
  if (screenHasConsent && !bundle) {
    api.access.deny('Application configuration error. Contact support. [PP_BUNDLE]');
    return;
  }
  const bundleKey = bundle?.bundleKey ?? '';

  // Extract form fields
  const fields = (event.prompt?.fields as Record<string, unknown>) ?? {};

  // Server-side validation
  const validator = SCREEN_VALIDATORS[policy.screen];
  if (!validator) {
    api.access.deny('Application configuration error. Contact support. [PP_SCREEN]');
    return;
  }

  const error = validator(fields);
  if (error) {
    api.access.deny(error);
    return;
  }

  // ---- Persist profile → user_metadata.profile ----
  const existingProfile = (
    (event.user.user_metadata ?? {}) as Record<string, unknown>
  ).profile ?? {};

  const profileUpdate: Record<string, string> = {
    ...(existingProfile as Record<string, string>),
  };

  const firstName = sanitizeString(fields.first_name);
  const lastName = sanitizeString(fields.last_name);

  if (firstName) profileUpdate.first_name = firstName;
  if (lastName) profileUpdate.last_name = lastName;
  // Convention: if optional field is blank, do NOT write it.
  // Absence = "never provided". Empty string is never stored.

  api.user.setUserMetadata('profile', profileUpdate);

  // ---- Persist consent → app_metadata.consents ----
  if (screenHasConsent) {
    const existingConsents = (
      (event.user.app_metadata ?? {}) as Record<string, unknown>
    ).consents ?? {};
    const nextConsents = { ...(existingConsents as Record<string, unknown>) };

    const ts = nowIso();

    if (isTruthy(fields.legal_accept)) {
      nextConsents.legal = {
        accepted: true,
        accepted_at: ts,
        bundle_key: bundleKey,
        policy_key: policy.policyKey,
        source: CONSENT_SOURCE,
      } satisfies ConsentRecord;
    }

    const mktStatus = fields.marketing_status;
    if (mktStatus === 'opt_in' || mktStatus === 'opt_out') {
      nextConsents.marketing = {
        status: mktStatus,
        updated_at: ts,
        bundle_key: bundleKey,
        policy_key: policy.policyKey,
        source: CONSENT_SOURCE,
      } satisfies MarketingRecord;
    }

    api.user.setAppMetadata('consents', nextConsents);
  }
};
