const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;

class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const request = async (path, options = {}) => {
  const token = window.localStorage.getItem('sportportal:token');
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(options.headers || {}),
    },
    ...options,
  });

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
