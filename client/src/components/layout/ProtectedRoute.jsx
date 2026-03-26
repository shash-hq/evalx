import {Navigate, Outlet} from 'react-router-dom';
import {useAuth} from '../../hooks/useAuth.js';

export default function ProtectedRoute() {
  const {isAuthenticated, loading} = useAuth();
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-muted font-mono text-sm">
        AUTHENTICATING...
      </div>
    );
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
