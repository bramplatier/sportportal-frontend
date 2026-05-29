const RAW_API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').trim();
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, '') || '/api';
const DEV_MODE = Boolean(import.meta.env.DEV);

const normalizePath = (path = '') => {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
};

const baseEndsWithApi = () => API_BASE_URL === '/api' || API_BASE_URL.endsWith('/api');

const normalizeRequestPath = (path) => {
  const normalizedPath = normalizePath(path);

  // If base already includes /api, avoid generating /api/api/... paths.
  if (baseEndsWithApi() && normalizedPath.startsWith('/api/')) {
    return normalizedPath.slice(4);
  }

  if (baseEndsWithApi() && normalizedPath === '/api') {
    return '/';
  }

  return normalizedPath;
};

const buildApiUrl = (path) => {
  const normalizedPath = normalizeRequestPath(path);
  return `${API_BASE_URL}${normalizedPath}`;
};

let hasLoggedApiDiagnostics = false;

const logApiDiagnostics = () => {
  if (!DEV_MODE || hasLoggedApiDiagnostics) {
    return;
  }

  hasLoggedApiDiagnostics = true;

  const isAbsoluteHttp = API_BASE_URL.startsWith('http://');
  const isPageHttps = window.location.protocol === 'https:';

  if (isAbsoluteHttp && isPageHttps) {
    console.warn('[apiClient] Mixed-content risk: HTTPS page with HTTP API base.', {
      pageOrigin: window.location.origin,
      apiBaseUrl: API_BASE_URL,
      suggestion: 'Gebruik /api of een https:// API base URL.',
    });
    return;
  }

  if (API_BASE_URL.startsWith('http://10.') || API_BASE_URL.startsWith('http://192.168.') || API_BASE_URL.startsWith('http://172.')) {
    console.warn('[apiClient] Private HTTP API base detected. Dit faalt vaak achter HTTPS.', {
      pageOrigin: window.location.origin,
      apiBaseUrl: API_BASE_URL,
      suggestion: 'Gebruik same-origin via /api en reverse proxy.',
    });
  }
};

class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

let isRefreshing = false;
let refreshPromise = null;

const request = async (path, options = {}) => {
  logApiDiagnostics();

  const { _skipRetry, ...fetchOptions } = options;

  let response;

  const executeFetch = async () => {
    try {
      return await fetch(buildApiUrl(path), {
        headers: {
          'Content-Type': 'application/json',
          ...(fetchOptions.headers || {}),
        },
        credentials: 'include',
        ...fetchOptions,
      });
    } catch (error) {
      throw new ApiError(
        `Kan de API niet bereiken op ${API_BASE_URL}. Controleer backend host/poort en VITE_API_BASE_URL.`,
        0,
        { cause: String(error) }
      );
    }
  };

  response = await executeFetch();

  if (response.status === 401 && !_skipRetry && path !== '/api/auth/refresh') {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = fetch(buildApiUrl('/api/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      }).finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    if (refreshPromise) {
      try {
        const refreshResponse = await refreshPromise;
        if (refreshResponse && refreshResponse.ok) {
          response = await executeFetch();
        }
      } catch (e) {
        // Ignore refresh failure and let original 401 error throw
      }
    }
  }

  if (!response.ok) {
    let payload = null;

    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    const message = payload?.message || payload?.error || `API request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

export const adminApi = {
  getOverview: () => request('/api/admin/overview'),
  getUsers: () => request('/api/admin/users'),
  getTrainers: () => request('/api/admin/trainers'),
  getActivities: () => request('/api/admin/activities'),
  getVotes: () => request('/api/admin/votes'),
  createUser: ({ payload }) => request('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateActivityStatus: ({ activityId, status }) => request(`/api/admin/activities/${activityId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
  assignTrainerToActivity: ({ activityId, trainerId }) => request(`/api/admin/activities/${activityId}/trainer`, {
    method: 'PATCH',
    body: JSON.stringify({ trainerId }),
  }),
  updateUser: ({ userId, payload }) => request(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  deleteUser: ({ userId }) => request(`/api/admin/users/${userId}`, {
    method: 'DELETE',
  }),
  resetUserMfa: ({ userId }) => request(`/api/admin/users/${userId}/mfa/reset`, {
    method: 'POST',
  }),
};

export const authApi = {
  me: () => request('/api/me', { _skipRetry: true }),
  googleStart: () => window.location.assign('/api/auth/google/start?redirect=true'),
  refresh: () => request('/api/auth/refresh', { method: 'POST', _skipRetry: true }),
  logout: () => request('/api/auth/logout', { method: 'POST', _skipRetry: true }),
  login: ({ email, password }) => request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  register: ({ email, password }) => request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  verifyMfa: ({ challengeToken, otp }) => request('/api/auth/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({ challengeToken, otp }),
    _skipRetry: true,
  }),
  startMfaSetup: () => request('/api/auth/mfa/setup/start', {
    method: 'POST',
  }),
  confirmMfaSetup: ({ otp, setupToken }) => request('/api/auth/mfa/setup/confirm', {
    method: 'POST',
    body: JSON.stringify({ otp, setupToken }),
  }),
  disableMfa: ({ otp }) => request('/api/auth/mfa/disable', {
    method: 'POST',
    body: JSON.stringify({ otp }),
  }),
};

export const customerApi = {
  getProfile: () => request('/api/customer/profile'),
  deleteAccount: () => request('/api/customer/account', { method: 'DELETE' }),
  getCategories: () => request('/api/customer/categories'),
  setCategoryMembership: ({ categoryId, joined }) => request(`/api/customer/categories/${categoryId}`, {
    method: 'PATCH',
    body: JSON.stringify({ joined }),
  }),
  getMyLessons: () => request('/api/customer/lessons/my'),
  getAvailableLessons: () => request('/api/customer/lessons/available'),
  subscribeToLesson: ({ lessonId }) => request(`/api/customer/lessons/${lessonId}/subscribe`, {
    method: 'POST',
  }),
  unsubscribeFromLesson: ({ lessonId }) => request(`/api/customer/lessons/${lessonId}/unsubscribe`, {
    method: 'POST',
  }),
};

export const trainerApi = {
  getSessions: () => request('/api/trainer/sessions'),
  createSession: ({ title, date, location }) => request('/api/trainer/sessions', {
    method: 'POST',
    body: JSON.stringify({ title, date, location }),
  }),
  updateSession: ({ sessionId, payload }) => request(`/api/trainer/sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  getParticipants: ({ sessionId }) => request(`/api/trainer/sessions/${sessionId}/participants`),
  getPolls: () => request('/api/trainer/polls'),
  createPoll: ({ payload }) => request('/api/trainer/polls', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getPollVoters: ({ pollId }) => request(`/api/trainer/polls/${pollId}/votes`),
  deletePoll: ({ pollId }) => request(`/api/trainer/polls/${pollId}`, {
    method: 'DELETE',
  }),
  updatePoll: ({ pollId, payload }) => request(`/api/trainer/polls/${pollId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  setActivePoll: ({ pollId }) => request(`/api/trainer/polls/${pollId}/activate`, {
    method: 'POST',
  }),
};

export const votingApi = {
  getOverview: () => request('/api/voting/overview'),
  submitVote: ({ optionId }) => request('/api/voting/vote', {
    method: 'POST',
    body: JSON.stringify({ optionId }),
  }),
};

export const macApi = {
  registerMacAddress: ({ macAddress, deviceName }) => request('/api/admin/mac/register', {
    method: 'POST',
    body: JSON.stringify({ macAddress, deviceName }),
  }),
  getTrustedMacAddresses: () => request('/api/admin/mac/trusted', {
    method: 'GET',
  }),
  revokeMacAddress: ({ macId }) => request(`/api/admin/mac/${macId}/revoke`, {
    method: 'POST',
  }),
  getMacAccessLog: ({ limit = 50, offset = 0 }) => request(`/api/admin/mac/access-log?limit=${limit}&offset=${offset}`, {
    method: 'GET',
  }),
  getMacPolicy: () => request('/api/admin/mac/policy', {
    method: 'GET',
  }),
  updateMacPolicy: ({ payload }) => request('/api/admin/mac/policy', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  getVerifyStatus: () => request('/api/admin/mac/verify-status', {
    method: 'GET',
  }),
};

export { API_BASE_URL, ApiError, request };
