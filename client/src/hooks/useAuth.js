import { useSelector } from 'react-redux';
import { isAdminRole, isOrganizerRole, isSuperAdminRole } from '../utils/roles.js';

export const useAuth = () => {
  const { user, loading, accessToken } = useSelector((state) => state.auth);
  return {
    user,
    accessToken,
    loading,
    isAuthenticated: !!user && !!accessToken,
    isAdmin: isAdminRole(user?.role),
    isOrganizer: isOrganizerRole(user?.role),
    isSuperAdmin: isSuperAdminRole(user?.role),
  };
};
