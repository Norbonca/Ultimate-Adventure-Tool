import { describe, expect, it } from 'vitest';
import { authErrorKey } from './auth-error';
import { t, setLocale } from '@uat/i18n';

describe('localized authentication errors', () => {
  it.each([
    ['invalid_credentials', 'invalidCredentials'],
    ['user_already_exists', 'userAlreadyExists'],
    ['email_exists', 'userAlreadyExists'],
    ['email_not_confirmed', 'emailNotConfirmed'],
    ['weak_password', 'weakPassword'],
    ['email_address_invalid', 'invalidEmail'],
    ['provider_disabled', 'unavailable'],
    ['over_email_send_rate_limit', 'rateLimited'],
  ])('maps stable provider code %s', (code, suffix) => {
    expect(authErrorKey({ code })).toBe(`auth.errors.${suffix}`);
  });
  it('uses a translated fallback and handles generic HTTP rate limits', () => {
    expect(authErrorKey({ code: 'future_code' })).toBe('auth.errors.generic');
    expect(authErrorKey({})).toBe('auth.errors.generic');
    expect(authErrorKey({ status: 429 })).toBe('auth.errors.rateLimited');
  });
  it('can retranslate the same error after a language switch', () => {
    const key = authErrorKey({ code: 'invalid_credentials' });
    setLocale('hu');
    expect(t(key)).toBe('Hibás email-cím vagy jelszó.');
    setLocale('en');
    expect(t(key)).toBe('Invalid email or password.');
    setLocale('hu');
  });
});
