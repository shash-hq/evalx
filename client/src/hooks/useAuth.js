import { useSelector } from 'react-redux';

export const useAuth = () => {
  const { user, loading } = useSelector((state) => state.auth);
  return {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isOrganizer: user?.role === 'organizer' || user?.role === 'admin',
  };
};
