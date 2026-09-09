/**
 * @file errorTypes.js
 * Standardized SaaS Error Classification for InvestmentAI.
 */

export const ApiErrorCode = Object.freeze({
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  DATA_UNAVAILABLE: 'DATA_UNAVAILABLE',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  STALE_DATA: 'STALE_DATA',
  SERVER_ERROR: 'SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
});

export class ApiError extends Error {
  constructor({
    code = ApiErrorCode.UNKNOWN_ERROR,
    message = 'An unexpected error occurred',
    status = 500,
    details = null,
    source = 'API_CLIENT',
    timestamp = new Date().toISOString()
  }) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.source = source;
    this.timestamp = timestamp;
  }
}

/**
 * Maps raw HTTP errors or exceptions to structured ApiError
 */
export function normalizeApiError(error) {
  if (error instanceof ApiError) return error;

  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return new ApiError({
      code: ApiErrorCode.NETWORK_ERROR,
      message: 'Request timed out. The intelligence pipeline is processing large institutional datasets. Please retry shortly.',
      status: 408,
      details: error.message
    });
  }

  if (!error.response) {
    return new ApiError({
      code: ApiErrorCode.NETWORK_ERROR,
      message: 'Network error: Unable to connect to the InvestmentAI server. Please check your connectivity.',
      status: 0,
      details: error.message
    });
  }

  const status = error.response.status;
  const data = error.response.data || {};
  const serverMsg = data.message || data.error || error.message;

  let code = ApiErrorCode.UNKNOWN_ERROR;

  switch (status) {
    case 400:
      code = ApiErrorCode.VALIDATION_ERROR;
      break;
    case 401:
      code = ApiErrorCode.AUTHENTICATION_ERROR;
      break;
    case 403:
      code = ApiErrorCode.AUTHORIZATION_ERROR;
      break;
    case 404:
      code = data.code === 'DATA_UNAVAILABLE' ? ApiErrorCode.DATA_UNAVAILABLE : ApiErrorCode.NOT_FOUND;
      break;
    case 409:
      code = ApiErrorCode.CONFLICT;
      break;
    case 422:
      code = data.code === 'INSUFFICIENT_DATA' ? ApiErrorCode.INSUFFICIENT_DATA : ApiErrorCode.VALIDATION_ERROR;
      break;
    case 429:
      code = ApiErrorCode.RATE_LIMITED;
      break;
    case 502:
    case 503:
      code = ApiErrorCode.PROVIDER_ERROR;
      break;
    case 500:
    default:
      code = ApiErrorCode.SERVER_ERROR;
      break;
  }

  return new ApiError({
    code: data.code || code,
    message: serverMsg || 'An error occurred while communicating with the server',
    status,
    details: data.details || data
  });
}
