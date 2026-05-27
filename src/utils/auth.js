const ROLE_ALIASES = {
  member: 'customer',
  klant: 'customer',
  customer: 'customer',
  user: 'customer',
  trainer: 'trainer',
  coach: 'trainer',
  admin: 'admin',
};

const ROLE_CAPABILITIES = {
  customer: [
    'auth.login',
    'profile.view',
    'lessons.view.my',
    'lessons.view.available',
    'lessons.subscribe',
    'lessons.unsubscribe',
    'categories.join',
    'categories.leave',
  ],
  trainer: [
    'auth.login',
    'profile.view',
    'trainer.sessions.view',
    'trainer.sessions.create',
    'trainer.participants.view',
    'trainer.activities.organize',
    'trainer.polls.view',
    'trainer.polls.create',
    'trainer.polls.voters.view',
    'trainer.polls.delete',
    'trainer.polls.activate',
  ],
  admin: [
    'auth.login',
    'profile.view',
    'trainer.sessions.view',
    'trainer.sessions.create',
    'trainer.participants.view',
    'trainer.activities.organize',
    'trainer.polls.view',
    'trainer.polls.create',
    'trainer.polls.voters.view',
    'trainer.polls.delete',
    'trainer.polls.activate',
    'admin.users.view',
    'admin.users.approve',
    'admin.users.update',
    'admin.users.remove',
    'admin.mfa.reset',
    'admin.activities.view',
    'admin.activities.create',
    'admin.activities.status.update',
    'admin.activities.assign.trainer',
    'admin.votes.view',
    'admin.system.maintain',
  ],
};

const normalizeRole = (role) => ROLE_ALIASES[String(role || '').toLowerCase()] || 'customer';

const hasRole = (user, allowedRoles = []) => {
  if (!user) return false;
  return allowedRoles.includes(normalizeRole(user.role));
};

const getCapabilitiesForRole = (role) => ROLE_CAPABILITIES[normalizeRole(role)] || ROLE_CAPABILITIES.customer;

const hasCapability = (user, capability) => {
  if (!user || !capability) return false;
  return getCapabilitiesForRole(user.role).includes(capability);
};

export { getCapabilitiesForRole, hasCapability, hasRole, normalizeRole };
