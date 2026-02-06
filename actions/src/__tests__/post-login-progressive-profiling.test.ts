/**
 * Tests for: Post-Login Progressive Profiling Action
 *
 * Run: npx jest __tests__/post-login-progressive-profiling.test.ts
 *
 * These tests cover:
 *   - Gate logic (pp_enabled)
 *   - Policy resolution and misconfiguration handling
 *   - Consent bundle resolution and misconfiguration handling
 *   - Completeness checks (skip form when data exists)
 *   - Form rendering with correct fields
 *   - Server-side validation (onContinuePostLogin)
 *   - Metadata persistence (user_metadata + app_metadata)
 *   - Input sanitization and security
 */

// ============================================================================
// Mocks & Helpers
// ============================================================================

type MockAPI = {
  access: { deny: jest.Mock };
  prompt: { render: jest.Mock };
  user: { setUserMetadata: jest.Mock; setAppMetadata: jest.Mock };
};

function createMockApi(): MockAPI {
  return {
    access: { deny: jest.fn() },
    prompt: { render: jest.fn() },
    user: { setUserMetadata: jest.fn(), setAppMetadata: jest.fn() },
  };
}

type EventOverrides = {
  clientMetadata?: Record<string, string>;
  userMetadata?: Record<string, unknown>;
  appMetadata?: Record<string, unknown>;
  promptFields?: Record<string, unknown>;
};

function createMockEvent(overrides: EventOverrides = {}): Record<string, unknown> {
  return {
    client: {
      metadata: overrides.clientMetadata ?? {},
    },
    user: {
      user_metadata: overrides.userMetadata ?? {},
      app_metadata: overrides.appMetadata ?? {},
    },
    prompt: overrides.promptFields
      ? { fields: overrides.promptFields }
      : undefined,
  };
}

/** Standard client_metadata for an enabled app */
const ENABLED_CLIENT_META = {
  pp_enabled: 'true',
  pp_policy_key: 'pp.standard.v1',
  consent_bundle_key: 'ot.bundle.global.v1',
};

/** User who has completed all required fields */
const COMPLETE_USER_META = {
  profile: { first_name: 'Jane' },
};

const COMPLETE_APP_META = {
  consents: {
    legal: {
      accepted: true,
      bundle_key: 'ot.bundle.global.v1',
      accepted_at: '2025-01-01T00:00:00.000Z',
      policy_key: 'pp.standard.v1',
      source: 'auth0_pp_form',
    },
  },
};

/** Valid form submission */
const VALID_SUBMISSION = {
  first_name: 'Jane',
  last_name: 'Doe',
  legal_accept: 'true',
  marketing_status: 'opt_in',
};

// ============================================================================
// Import action handlers
// ============================================================================

// We require the compiled JS. In a real project, compile first or use ts-jest.
// For this test structure, we use the TS source directly with ts-jest.
const action = require('../src/actions/post-login-progressive-profiling');

// ============================================================================
// Utility function tests
// ============================================================================

import { isBlank, isTruthy, isValidName, sanitizeString } from '../src/actions/post-login-progressive-profiling';

describe('isBlank', () => {
  it('returns true for null, undefined, empty string, whitespace', () => {
    expect(isBlank(null)).toBe(true);
    expect(isBlank(undefined)).toBe(true);
    expect(isBlank('')).toBe(true);
    expect(isBlank('   ')).toBe(true);
  });

  it('returns false for non-empty strings', () => {
    expect(isBlank('a')).toBe(false);
    expect(isBlank(' a ')).toBe(false);
  });
});

describe('isTruthy', () => {
  it('recognizes truthy values', () => {
    expect(isTruthy(true)).toBe(true);
    expect(isTruthy('true')).toBe(true);
    expect(isTruthy('yes')).toBe(true);
    expect(isTruthy('1')).toBe(true);
  });

  it('rejects non-truthy values', () => {
    expect(isTruthy(false)).toBe(false);
    expect(isTruthy('false')).toBe(false);
    expect(isTruthy('')).toBe(false);
    expect(isTruthy(null)).toBe(false);
    expect(isTruthy(undefined)).toBe(false);
    expect(isTruthy(0)).toBe(false);
  });
});

describe('isValidName', () => {
  it('accepts normal names', () => {
    expect(isValidName('Jane')).toBe(true);
    expect(isValidName('O\'Brien')).toBe(true);
    expect(isValidName('Mary-Jane')).toBe(true);
    expect(isValidName('Dr. Smith')).toBe(true);
    expect(isValidName('José')).toBe(true);
    expect(isValidName('Müller')).toBe(true);
  });

  it('rejects dangerous input', () => {
    expect(isValidName('<script>alert(1)</script>')).toBe(false);
    expect(isValidName('Jane{}')).toBe(false);
    expect(isValidName('Jane\\Doe')).toBe(false);
  });

  it('rejects control characters', () => {
    expect(isValidName('Jane\x00')).toBe(false);
    expect(isValidName('Jane\x1F')).toBe(false);
    expect(isValidName('Jane\x7F')).toBe(false);
  });

  it('rejects empty and oversized input', () => {
    expect(isValidName('')).toBe(false);
    expect(isValidName('   ')).toBe(false);
    expect(isValidName('a'.repeat(256))).toBe(false);
  });

  it('rejects non-string input', () => {
    expect(isValidName(123)).toBe(false);
    expect(isValidName(null)).toBe(false);
    expect(isValidName(undefined)).toBe(false);
  });
});

describe('sanitizeString', () => {
  it('trims and caps length', () => {
    expect(sanitizeString('  Jane  ')).toBe('Jane');
    expect(sanitizeString('a'.repeat(300)).length).toBe(255);
  });

  it('returns empty string for non-strings', () => {
    expect(sanitizeString(null)).toBe('');
    expect(sanitizeString(123)).toBe('');
  });
});

// ============================================================================
// onExecutePostLogin
// ============================================================================

describe('onExecutePostLogin', () => {
  describe('gate: pp_enabled', () => {
    it('does nothing when pp_enabled is missing', async () => {
      const api = createMockApi();
      const event = createMockEvent({ clientMetadata: {} });
      await action.onExecutePostLogin(event, api);
      expect(api.prompt.render).not.toHaveBeenCalled();
      expect(api.access.deny).not.toHaveBeenCalled();
    });

    it('does nothing when pp_enabled is "false"', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: { pp_enabled: 'false' },
      });
      await action.onExecutePostLogin(event, api);
      expect(api.prompt.render).not.toHaveBeenCalled();
    });
  });

  describe('misconfiguration handling', () => {
    it('denies access when pp_policy_key is missing', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: { pp_enabled: 'true' },
      });
      await action.onExecutePostLogin(event, api);
      expect(api.access.deny).toHaveBeenCalledWith(
        expect.stringContaining('[PP_POLICY]')
      );
    });

    it('denies access when pp_policy_key is invalid', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: {
          pp_enabled: 'true',
          pp_policy_key: 'pp.nonexistent.v1',
        },
      });
      await action.onExecutePostLogin(event, api);
      expect(api.access.deny).toHaveBeenCalledWith(
        expect.stringContaining('[PP_POLICY]')
      );
    });

    it('denies access when consent_bundle_key is missing but screen needs consent', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: {
          pp_enabled: 'true',
          pp_policy_key: 'pp.standard.v1',
          // consent_bundle_key intentionally missing
        },
      });
      await action.onExecutePostLogin(event, api);
      expect(api.access.deny).toHaveBeenCalledWith(
        expect.stringContaining('[PP_BUNDLE]')
      );
    });
  });

  describe('completeness check: skip when satisfied', () => {
    it('does not render form when all required data is present', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: ENABLED_CLIENT_META,
        userMetadata: COMPLETE_USER_META,
        appMetadata: COMPLETE_APP_META,
      });
      await action.onExecutePostLogin(event, api);
      expect(api.prompt.render).not.toHaveBeenCalled();
      expect(api.access.deny).not.toHaveBeenCalled();
    });

    it('does not render form when optional last_name is missing but required fields present', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: ENABLED_CLIENT_META,
        userMetadata: { profile: { first_name: 'Jane' } }, // no last_name
        appMetadata: COMPLETE_APP_META,
      });
      await action.onExecutePostLogin(event, api);
      expect(api.prompt.render).not.toHaveBeenCalled();
    });

    it('does not render form when optional marketing is missing but required fields present', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: ENABLED_CLIENT_META,
        userMetadata: COMPLETE_USER_META,
        appMetadata: COMPLETE_APP_META, // no marketing consent
      });
      await action.onExecutePostLogin(event, api);
      expect(api.prompt.render).not.toHaveBeenCalled();
    });
  });

  describe('form rendering: missing required data', () => {
    it('renders form when first_name is missing', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: ENABLED_CLIENT_META,
        userMetadata: {},
        appMetadata: COMPLETE_APP_META,
      });
      await action.onExecutePostLogin(event, api);
      expect(api.prompt.render).toHaveBeenCalledTimes(1);
      expect(api.prompt.render).toHaveBeenCalledWith(
        'ap_REPLACE_WITH_YOUR_FORM_ID',
        expect.objectContaining({
          fields: expect.objectContaining({
            pp_screen: 'profile_opt_ln__consent_opt_mkt',
            first_name: '',
          }),
        })
      );
    });

    it('renders form when legal consent is missing', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: ENABLED_CLIENT_META,
        userMetadata: COMPLETE_USER_META,
        appMetadata: {}, // no consent
      });
      await action.onExecutePostLogin(event, api);
      expect(api.prompt.render).toHaveBeenCalledTimes(1);
    });

    it('renders form when legal consent has wrong bundle_key', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: ENABLED_CLIENT_META,
        userMetadata: COMPLETE_USER_META,
        appMetadata: {
          consents: {
            legal: {
              accepted: true,
              bundle_key: 'ot.bundle.old.v0', // stale bundle
            },
          },
        },
      });
      await action.onExecutePostLogin(event, api);
      expect(api.prompt.render).toHaveBeenCalledTimes(1);
    });

    it('renders form when both profile and consent are missing', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: ENABLED_CLIENT_META,
        userMetadata: {},
        appMetadata: {},
      });
      await action.onExecutePostLogin(event, api);
      expect(api.prompt.render).toHaveBeenCalledTimes(1);
    });

    it('prefills existing data into form fields', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: ENABLED_CLIENT_META,
        userMetadata: { profile: { first_name: 'Jane', last_name: 'Doe' } },
        appMetadata: {}, // missing consent triggers form
      });
      await action.onExecutePostLogin(event, api);
      expect(api.prompt.render).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          fields: expect.objectContaining({
            first_name: 'Jane',
            last_name: 'Doe',
          }),
        })
      );
    });
  });
});

// ============================================================================
// onContinuePostLogin
// ============================================================================

describe('onContinuePostLogin', () => {
  describe('gate', () => {
    it('does nothing when pp_enabled is not true', async () => {
      const api = createMockApi();
      const event = createMockEvent({ clientMetadata: {} });
      await action.onContinuePostLogin(event, api);
      expect(api.user.setUserMetadata).not.toHaveBeenCalled();
      expect(api.access.deny).not.toHaveBeenCalled();
    });
  });

  describe('validation: required fields', () => {
    it('denies when first_name is blank', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: ENABLED_CLIENT_META,
        userMetadata: {},
        appMetadata: {},
        promptFields: { ...VALID_SUBMISSION, first_name: '' },
      });
      await action.onContinuePostLogin(event, api);
      expect(api.access.deny).toHaveBeenCalledWith('First name is required.');
    });

    it('denies when legal_accept is false', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: ENABLED_CLIENT_META,
        userMetadata: {},
        appMetadata: {},
        promptFields: { ...VALID_SUBMISSION, legal_accept: 'false' },
      });
      await action.onContinuePostLogin(event, api);
      expect(api.access.deny).toHaveBeenCalledWith(
        'You must accept the policy to continue.'
      );
    });

    it('denies when legal_accept is missing', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: ENABLED_CLIENT_META,
        userMetadata: {},
        appMetadata: {},
        promptFields: { ...VALID_SUBMISSION, legal_accept: undefined },
      });
      await action.onContinuePostLogin(event, api);
      expect(api.access.deny).toHaveBeenCalledWith(
        'You must accept the policy to continue.'
      );
    });
  });

  describe('validation: input sanitization', () => {
    it('denies first_name with angle brackets', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: ENABLED_CLIENT_META,
        userMetadata: {},
        appMetadata: {},
        promptFields: {
          ...VALID_SUBMISSION,
          first_name: '<script>alert(1)</script>',
        },
      });
      await action.onContinuePostLogin(event, api);
      expect(api.access.deny).toHaveBeenCalledWith(
        'First name contains invalid characters.'
      );
    });

    it('denies last_name with dangerous characters when provided', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: ENABLED_CLIENT_META,
        userMetadata: {},
        appMetadata: {},
        promptFields: { ...VALID_SUBMISSION, last_name: 'Doe{}' },
      });
      await action.onContinuePostLogin(event, api);
      expect(api.access.deny).toHaveBeenCalledWith(
        'Last name contains invalid characters.'
      );
    });

    it('allows blank last_name (it is optional)', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: ENABLED_CLIENT_META,
        userMetadata: {},
        appMetadata: {},
        promptFields: { ...VALID_SUBMISSION, last_name: '' },
      });
      await action.onContinuePostLogin(event, api);
      expect(api.access.deny).not.toHaveBeenCalled();
      expect(api.user.setUserMetadata).toHaveBeenCalled();
    });
  });

  describe('persistence: user_metadata.profile', () => {
    it('writes first_name and last_name to profile', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: ENABLED_CLIENT_META,
        userMetadata: {},
        appMetadata: {},
        promptFields: VALID_SUBMISSION,
      });
      await action.onContinuePostLogin(event, api);
      expect(api.user.setUserMetadata).toHaveBeenCalledWith(
        'profile',
        expect.objectContaining({
          first_name: 'Jane',
          last_name: 'Doe',
        })
      );
    });

    it('does NOT write last_name if blank (absence convention)', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: ENABLED_CLIENT_META,
        userMetadata: {},
        appMetadata: {},
        promptFields: { ...VALID_SUBMISSION, last_name: '' },
      });
      await action.onContinuePostLogin(event, api);
      const profileArg = api.user.setUserMetadata.mock.calls[0][1];
      expect(profileArg).toHaveProperty('first_name', 'Jane');
      expect(profileArg).not.toHaveProperty('last_name');
    });

    it('preserves existing profile fields when updating', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: ENABLED_CLIENT_META,
        userMetadata: { profile: { phone: '555-1234', first_name: 'OldName' } },
        appMetadata: {},
        promptFields: VALID_SUBMISSION,
      });
      await action.onContinuePostLogin(event, api);
      const profileArg = api.user.setUserMetadata.mock.calls[0][1];
      expect(profileArg.phone).toBe('555-1234');
      expect(profileArg.first_name).toBe('Jane'); // overwritten
    });

    it('trims whitespace from names', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: ENABLED_CLIENT_META,
        userMetadata: {},
        appMetadata: {},
        promptFields: { ...VALID_SUBMISSION, first_name: '  Jane  ', last_name: '  Doe  ' },
      });
      await action.onContinuePostLogin(event, api);
      const profileArg = api.user.setUserMetadata.mock.calls[0][1];
      expect(profileArg.first_name).toBe('Jane');
      expect(profileArg.last_name).toBe('Doe');
    });
  });

  describe('persistence: app_metadata.consents', () => {
    it('writes legal consent with audit fields', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: ENABLED_CLIENT_META,
        userMetadata: {},
        appMetadata: {},
        promptFields: VALID_SUBMISSION,
      });
      await action.onContinuePostLogin(event, api);
      const consentsArg = api.user.setAppMetadata.mock.calls[0][1];
      expect(consentsArg.legal).toMatchObject({
        accepted: true,
        bundle_key: 'ot.bundle.global.v1',
        policy_key: 'pp.standard.v1',
        source: 'auth0_pp_form',
      });
      expect(consentsArg.legal.accepted_at).toBeDefined();
    });

    it('writes marketing opt_in when chosen', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: ENABLED_CLIENT_META,
        userMetadata: {},
        appMetadata: {},
        promptFields: { ...VALID_SUBMISSION, marketing_status: 'opt_in' },
      });
      await action.onContinuePostLogin(event, api);
      const consentsArg = api.user.setAppMetadata.mock.calls[0][1];
      expect(consentsArg.marketing).toMatchObject({
        status: 'opt_in',
        bundle_key: 'ot.bundle.global.v1',
        policy_key: 'pp.standard.v1',
        source: 'auth0_pp_form',
      });
    });

    it('writes marketing opt_out when chosen', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: ENABLED_CLIENT_META,
        userMetadata: {},
        appMetadata: {},
        promptFields: { ...VALID_SUBMISSION, marketing_status: 'opt_out' },
      });
      await action.onContinuePostLogin(event, api);
      const consentsArg = api.user.setAppMetadata.mock.calls[0][1];
      expect(consentsArg.marketing.status).toBe('opt_out');
    });

    it('does NOT write marketing when status is unset', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: ENABLED_CLIENT_META,
        userMetadata: {},
        appMetadata: {},
        promptFields: { ...VALID_SUBMISSION, marketing_status: 'unset' },
      });
      await action.onContinuePostLogin(event, api);
      const consentsArg = api.user.setAppMetadata.mock.calls[0][1];
      expect(consentsArg.marketing).toBeUndefined();
    });

    it('does NOT write marketing when status is blank', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: ENABLED_CLIENT_META,
        userMetadata: {},
        appMetadata: {},
        promptFields: { ...VALID_SUBMISSION, marketing_status: '' },
      });
      await action.onContinuePostLogin(event, api);
      const consentsArg = api.user.setAppMetadata.mock.calls[0][1];
      expect(consentsArg.marketing).toBeUndefined();
    });

    it('preserves existing consent fields when updating', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: ENABLED_CLIENT_META,
        userMetadata: {},
        appMetadata: {
          consents: {
            some_other_consent: { accepted: true },
          },
        },
        promptFields: VALID_SUBMISSION,
      });
      await action.onContinuePostLogin(event, api);
      const consentsArg = api.user.setAppMetadata.mock.calls[0][1];
      expect(consentsArg.some_other_consent).toEqual({ accepted: true });
      expect(consentsArg.legal.accepted).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles missing prompt.fields gracefully', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: ENABLED_CLIENT_META,
        userMetadata: {},
        appMetadata: {},
        // no promptFields
      });
      // Override prompt to be undefined
      (event as any).prompt = undefined;
      await action.onContinuePostLogin(event, api);
      // Should deny because required fields are missing
      expect(api.access.deny).toHaveBeenCalled();
    });

    it('handles misconfigured policy in onContinue', async () => {
      const api = createMockApi();
      const event = createMockEvent({
        clientMetadata: {
          pp_enabled: 'true',
          pp_policy_key: 'pp.nonexistent.v1',
        },
        promptFields: VALID_SUBMISSION,
      });
      await action.onContinuePostLogin(event, api);
      expect(api.access.deny).toHaveBeenCalledWith(
        expect.stringContaining('[PP_POLICY]')
      );
    });
  });
});
