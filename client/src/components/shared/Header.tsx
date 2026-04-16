import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Application header with navigation.
 * Shows different nav items based on auth state.
 * Fully keyboard-navigable with proper ARIA roles.
 */
export default function Header() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="app-header" role="banner">
      <div className="header-inner">
        <Link to="/" className="header-logo" aria-label="VenueFlow home">
          <span className="logo-icon" aria-hidden="true">🏟️</span>
          <span className="logo-text">VenueFlow</span>
          <span className="logo-live" aria-label="Live updates active">
            <span className="pulse-dot" aria-hidden="true"></span>
            LIVE
          </span>
        </Link>

        <nav className="header-nav" role="navigation" aria-label="Main navigation">
          <Link
            to="/"
            className={`nav-link ${isActive('/') ? 'nav-link--active' : ''}`}
            aria-current={isActive('/') ? 'page' : undefined}
          >
            Venue Map
          </Link>
          <Link
            to="/navigate"
            className={`nav-link ${isActive('/navigate') ? 'nav-link--active' : ''}`}
            aria-current={isActive('/navigate') ? 'page' : undefined}
          >
            Navigate
          </Link>
          <Link
            to="/ask"
            className={`nav-link ${isActive('/ask') ? 'nav-link--active' : ''}`}
            aria-current={isActive('/ask') ? 'page' : undefined}
          >
            Ask AI
          </Link>
          {user ? (
            <>
              <Link
                to="/staff"
                className={`nav-link nav-link--staff ${isActive('/staff') ? 'nav-link--active' : ''}`}
                aria-current={isActive('/staff') ? 'page' : undefined}
              >
                Staff Dashboard
              </Link>
              <button
                className="nav-button nav-button--signout"
                onClick={signOut}
                aria-label="Sign out of staff account"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              to="/staff/login"
              className={`nav-link nav-link--staff ${isActive('/staff/login') ? 'nav-link--active' : ''}`}
            >
              Staff Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
