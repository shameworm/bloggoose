// Nest loads this in the app; this spec imports no Nest code, so load it here.
import 'reflect-metadata';

import { validate } from './env.validation.js';

// Values as they come from .env: always strings.
const env = {
  OBSERVE_APP_KEY: 'key',
  OBSERVE_APP_SECRET: 'secret',
  OBSERVE_APP_SERVICE_ID: 'service',
  DB_HOST: 'localhost',
  DB_PORT: '5433',
  DB_USERNAME: 'bloggoose',
  DB_PASSWORD: 'password',
  DB_NAME: 'bloggoose',
  CORS_ORIGIN: 'http://localhost:3001',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'r'.repeat(32),
  JWT_ACCESS_TTL: '900',
  JWT_REFRESH_TTL_DAYS: '30',
};

describe('validate (env)', () => {
  it('turns number strings into numbers and fills defaults', () => {
    const result = validate(env);

    expect(result.DB_PORT).toBe(5433);
    expect(result.JWT_ACCESS_TTL).toBe(900);
    expect(result.PORT).toBe(3000);
    expect(result.NODE_ENV).toBe('development');
  });

  it.each([
    ['a missing variable', { DB_HOST: undefined }],
    ['a short JWT secret', { JWT_ACCESS_SECRET: 'too-short' }],
    ['a port that is not a number', { DB_PORT: 'abc' }],
    ['a zero TTL', { JWT_REFRESH_TTL_DAYS: '0' }],
    ['an unknown NODE_ENV', { NODE_ENV: 'staging' }],
  ])('fails on %s', (_name, change) => {
    expect(() => validate({ ...env, ...change })).toThrow();
  });

  it('names the broken variable in the error', () => {
    expect(() => validate({ ...env, DB_HOST: undefined })).toThrow(/DB_HOST/);
  });
});
