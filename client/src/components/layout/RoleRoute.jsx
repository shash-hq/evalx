import {Navigate, Outlet} from 'react-router-dom';
import {useAuth} from '../../hooks/useAuth.js';
import {hasRoleAccess} from '../../utils/roles.js';

export default function RoleRoute({roles}) {
  const {user, loading} = useAuth();
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-muted font-mono text-sm">
        LOADING...
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (!hasRoleAccess(user.role, ...roles)) return <Navigate to="/" replace />;
  return <Outlet />;
}
