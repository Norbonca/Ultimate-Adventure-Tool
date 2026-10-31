import type { TranslationKey } from '@uat/i18n';

const AUTH_ERROR_KEYS: Record<string, TranslationKey> = {
  invalid_credentials: 'auth.errors.invalidCredentials',
  user_already_exists: 'auth.errors.userAlreadyExists',
  email_exists: 'auth.errors.userAlreadyExists',
  email_not_confirmed: 'auth.errors.emailNotConfirmed',
  weak_password: 'auth.errors.weakPassword',
  email_address_invalid: 'auth.errors.invalidEmail',
  email_address_not_authorized: 'auth.errors.invalidEmail',
  over_request_rate_limit: 'auth.errors.rateLimited',
  over_email_send_rate_limit: 'auth.errors.rateLimited',
  over_sms_send_rate_limit: 'auth.errors.rateLimited',
  provider_disabled: 'auth.errors.unavailable',
  email_provider_disabled: 'auth.errors.unavailable',
  signup_disabled: 'auth.errors.unavailable',
};

/** Provider codes are stable; raw messages may be English or contain internal details. */
export function authErrorKey(error: { code?: string; status?: number }): TranslationKey {
  if (error.status === 429) return 'auth.errors.rateLimited';
  return (error.code && AUTH_ERROR_KEYS[error.code]) || 'auth.errors.generic';
}
