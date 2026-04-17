import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LocationBadge from './LocationBadge';

const NAV_LINKS = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/policy', label: 'My Policy' },
  { path: '/wallet', label: 'Wallet' },
  { path: '/admin', label: 'Admin' },
];

export default function Navbar() {
  const { currentUser, userProfile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  if (!currentUser) return null;

  return (
    <nav className="sticky top-0 z-50 border-b border-border"
      style={{ background: 'rgba(6,10,16,0.92)', backdropFilter: 'blur(20px)' }}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">

        <Link to="/dashboard" className="font-mono text-sm tracking-widest">
          <span className="text-accent">Claim</span>
          <span className="text-gray-400">Shield</span>
        </Link>

        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ path, label }) => {
            const active = location.pathname === path;
            return (
              <Link key={path} to={path}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
                  ${active
                    ? 'text-accent bg-accent/8'
                    : 'text-gray-400 hover:text-white hover:bg-surface2'}`}>
                {label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          {userProfile && (
            <div className="text-right hidden sm:block">
              <div className="text-xs text-white font-medium">{userProfile.name}</div>
              <div className="text-xs text-gray-500 font-mono">
                {userProfile.platform?.toUpperCase()} · {userProfile.city?.toUpperCase()}
              </div>
            </div>
          )}

          {/* Current location zone — mobility tracking */}
          <LocationBadge />

          <div className="flex items-center gap-2">
            <div className="pulse-dot" />
            <span className="font-mono text-xs text-green">LIVE</span>
          </div>
          <button onClick={handleLogout}
            className="font-mono text-xs text-gray-500 hover:text-white transition-colors
               px-3 py-1.5 rounded border border-border hover:border-gray-600">
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}