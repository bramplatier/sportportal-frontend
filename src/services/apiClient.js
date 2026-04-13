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

const request = async (path, options = {}) => {
  logApiDiagnostics();

  const token = window.localStorage.getItem('sportportal:token');
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  let response;

  try {
    response = await fetch(buildApiUrl(path), {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (error) {
    throw new ApiError(
      `Kan de API niet bereiken op ${API_BASE_URL}. Controleer backend host/poort en VITE_API_BASE_URL.`,
      0,
      { cause: String(error) }
    );
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
  getActivities: () => request('/api/admin/activities'),
  getVotes: () => request('/api/admin/votes'),
  updateActivityStatus: ({ activityId, status }) => request(`/api/admin/activities/${activityId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
  approveUser: ({ userId }) => request(`/api/admin/users/${userId}/approve`, {
    method: 'POST',
  }),
};

export const authApi = {
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
  getParticipants: ({ sessionId }) => request(`/api/trainer/sessions/${sessionId}/participants`),
};

export const votingApi = {
  getOverview: () => request('/api/voting/overview'),
  submitVote: ({ optionId }) => request('/api/voting/vote', {
    method: 'POST',
    body: JSON.stringify({ optionId }),
  }),
};

export { API_BASE_URL, ApiError, request };
