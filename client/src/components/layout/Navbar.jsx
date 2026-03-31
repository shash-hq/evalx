import {Link, useNavigate, useLocation} from 'react-router-dom';
import {useDispatch} from 'react-redux';
import {useAuth} from '../../hooks/useAuth.js';
import {logout} from '../../store/slices/authSlice.js';
import {logoutAPI} from '../../services/authService.js';

export default function Navbar() {
  const {user, isAuthenticated, isAdmin, isOrganizer, isSuperAdmin} = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logoutAPI();
    } catch (_) {}
    dispatch(logout());
    navigate('/login');
  };

  const isActive = path => location.pathname === path;

  return (
    <nav className="border-b border-border bg-surface sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="font-display text-xl font-bold tracking-widest text-accent uppercase">
            EVAL<span className="text-text-primary">X</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {[
              {path: '/contests', label: 'CONTESTS'},
              ...(isOrganizer
                ? [{path: '/organizer', label: 'ORGANIZER'}]
                : []),
              ...(isAdmin ? [{path: '/admin', label: 'ADMIN'}] : []),
              ...(isSuperAdmin ? [{path: '/superadmin', label: 'SUPERADMIN'}] : []),
            ].map(({path, label}) => (
              <Link
                key={path}
                to={path}
                className={`font-mono text-xs px-3 py-1.5 transition-colors ${
                  isActive(path)
                    ? 'text-accent border-b border-accent'
                    : 'text-text-secondary hover:text-text-primary'
                }`}>
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="hidden md:flex items-center gap-2">
                <div className="w-7 h-7 bg-accent-dim border border-accent flex items-center justify-center">
                  <span className="font-mono text-xs text-accent font-bold">
                    {user?.name?.[0]?.toUpperCase()}
                  </span>
                </div>
                <span className="font-mono text-xs text-text-secondary">
                  {user?.name}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="btn-ghost text-xs px-3 py-1.5">
                LOGOUT
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost text-xs px-3 py-1.5">
                LOGIN
              </Link>
              <Link to="/register" className="btn-primary text-xs px-3 py-1.5">
                REGISTER
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
