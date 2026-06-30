import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="topbar-left">
          <NavLink to="/" className="brand">
            Lost & Found
          </NavLink>
        </div>

        {isAuthenticated ? (
          <>
            <div className="topbar-center">
              <input
                className="search-input"
                type="search"
                placeholder="Search items, locations..."
                aria-label="Search"
              />
            </div>

            <div className="topbar-right">
              <button
                className="icon-btn"
                title={user?.full_name || 'Profile'}
                onClick={() => navigate('/account')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" fill="#0f766e" />
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6v1H4v-1z" fill="#115e59" />
                </svg>
              </button>

              <button className="btn-ghost" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </>
        ) : (
          <div className="topbar-right">
            <NavLink to="/login" className="nav-link nav-action">
              Login
            </NavLink>
            <NavLink to="/register" className="nav-link nav-action nav-action-primary">
              Register
            </NavLink>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
