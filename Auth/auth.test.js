import { jest } from '@jest/globals';
import { authorize, normalizeRole, normalizeSignupInput } from './auth.js';

describe('Role-based app access', () => {
  it('maps legacy user role to customer for the storefront app', () => {
    expect(normalizeRole('user')).toBe('customer');
    expect(normalizeRole('merchant')).toBe('merchant');
  });

  it('allows merchant and admin roles through merchant routes', () => {
    const next = jest.fn();
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    authorize('merchant', 'admin')({ user: { role: 'merchant' } }, res, next);
    authorize('merchant', 'admin')({ user: { role: 'admin' } }, res, next);

    expect(next).toHaveBeenCalledTimes(2);
  });

  it('blocks customer access to merchant routes', () => {
    const next = jest.fn();
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    authorize('merchant', 'admin')({ user: { role: 'customer' } }, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('normalizes signup input and removes empty phone numbers', () => {
    expect(normalizeSignupInput({
      email: '  User@Example.com  ',
      password: 'secret123',
      first_name: '  Jane  ',
      last_name: '  Doe  ',
      phone_number: '   ',
      role: 'merchant',
    })).toEqual({
      email: 'user@example.com',
      password: 'secret123',
      first_name: 'Jane',
      last_name: 'Doe',
      phone_number: null,
      role: 'merchant',
    });
  });
});
