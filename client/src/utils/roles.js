const ROLE_ORDER = ['contestant', 'organizer', 'admin', 'superadmin'];

const ROLE_RANK = ROLE_ORDER.reduce((acc, role, index) => {
  acc[role] = index;
  return acc;
}, {});

export const hasRoleAccess = (userRole, ...requiredRoles) => {
  if (!userRole || requiredRoles.length === 0) return false;

  const userRank = ROLE_RANK[userRole];
  const minimumRequiredRank = Math.min(
    ...requiredRoles
      .map((role) => ROLE_RANK[role])
      .filter((rank) => Number.isInteger(rank))
  );

  if (!Number.isInteger(userRank) || !Number.isInteger(minimumRequiredRank)) {
    return false;
  }

  return userRank >= minimumRequiredRank;
};

export const isOrganizerRole = (role) => hasRoleAccess(role, 'organizer');
export const isAdminRole = (role) => hasRoleAccess(role, 'admin');
export const isSuperAdminRole = (role) => role === 'superadmin';
