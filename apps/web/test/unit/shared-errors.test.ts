/**
 * Unit tests for `@uat/core` shared error classes.
 *
 * Coverage targets:
 *   - AppError base class (statusCode, code, name)
 *   - NotFoundError → 404
 *   - UnauthorizedError → 401
 *   - instanceof chain, JSON serialization
 */

import { describe, it, expect } from 'vitest';
import { AppError, NotFoundError, UnauthorizedError } from '@uat/core';

describe('AppError', () => {
  it('has default statusCode 500 and code INTERNAL_ERROR', () => {
    const e = new AppError('Boom');
    expect(e.statusCode).toBe(500);
    expect(e.code).toBe('INTERNAL_ERROR');
    expect(e.name).toBe('AppError');
    expect(e.message).toBe('Boom');
  });

  it('honors custom statusCode and code', () => {
    const e = new AppError('Bad request', 400, 'BAD_REQUEST');
    expect(e.statusCode).toBe(400);
    expect(e.code).toBe('BAD_REQUEST');
  });

  it('is a real Error', () => {
    const e = new AppError('x');
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(AppError);
    expect(e.stack).toBeTruthy();
  });
});

describe('NotFoundError', () => {
  it('returns 404 with NOT_FOUND code', () => {
    const e = new NotFoundError('Trip');
    expect(e.statusCode).toBe(404);
    expect(e.code).toBe('NOT_FOUND');
    expect(e.message).toContain('Trip');
    expect(e.message).toContain('nem található');
  });

  it('extends AppError', () => {
    const e = new NotFoundError('User');
    expect(e).toBeInstanceOf(AppError);
    expect(e).toBeInstanceOf(Error);
  });
});

describe('UnauthorizedError', () => {
  it('returns 401 with UNAUTHORIZED code', () => {
    const e = new UnauthorizedError();
    expect(e.statusCode).toBe(401);
    expect(e.code).toBe('UNAUTHORIZED');
    expect(e.message).toBe('Nincs jogosultság');
  });

  it('honors custom message', () => {
    const e = new UnauthorizedError('Token expired');
    expect(e.message).toBe('Token expired');
    expect(e.statusCode).toBe(401);
  });

  it('extends AppError', () => {
    const e = new UnauthorizedError();
    expect(e).toBeInstanceOf(AppError);
  });
});
