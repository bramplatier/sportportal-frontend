const ROLE_ALIASES = {
  member: 'customer',
  klant: 'customer',
  customer: 'customer',
  user: 'customer',
  trainer: 'trainer',
  coach: 'trainer',
  admin: 'admin',
};

const normalizeRole = (role) => ROLE_ALIASES[String(role || '').toLowerCase()] || 'customer';

const getStoredUser = () => {
  const rawUser = window.localStorage.getItem('sportportal:user');

  if (!rawUser) {
    return null;
  }

  try {
    const user = JSON.parse(rawUser);
    return {
      ...user,
      role: normalizeRole(user?.role),
    };
  } catch (error) {
    return null;
  }
};

const hasRole = (user, allowedRoles = []) => {
  if (!user) return false;
  return allowedRoles.includes(normalizeRole(user.role));
};

const clearSession = () => {
  window.localStorage.removeItem('sportportal:user');
  window.localStorage.removeItem('sportportal:token');
};

export { clearSession, getStoredUser, hasRole, normalizeRole };
