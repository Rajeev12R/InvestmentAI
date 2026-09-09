// server/infrastructure/config.js
// NEW FILE

'use strict';

const NODE_ENV =
  process.env.NODE_ENV || 'development';

const isProduction =
  NODE_ENV === 'production';

function required(name) {
  const value = process.env[name];

  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    throw new Error(
      `Missing required environment variable: ${name}`
    );
  }

  return value;
}

function optional(
  name,
  fallback = undefined
) {
  return (
    process.env[name] ??
    fallback
  );
}

export const config = Object.freeze({
  nodeEnv: NODE_ENV,

  isProduction,

  port: Number(
    optional('PORT', 3000)
  ),

  database: {
    url: optional('DATABASE_URL'),
  },

  cors: {
    origins: optional(
      'CORS_ORIGINS',
      ''
    )
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  },
});

export function assertProductionConfig() {
  if (!isProduction) {
    return;
  }

  required('DATABASE_URL');

  if (
    config.cors.origins.length === 0
  ) {
    throw new Error(
      'CORS_ORIGINS is required in production'
    );
  }
}