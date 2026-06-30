import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { logout } = useAuth();

  const getClass = ({ isActive }) => (isActive ? 'side-link active' : 'side-link');

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={getClass} end>
          Dashboard
        </NavLink>
        <NavLink to="/lost-items" className={getClass}>
          Lost Items
        </NavLink>
        <NavLink to="/found-items" className={getClass}>
          Found Items
        </NavLink>
        <NavLink to="/marketplace" className={getClass}>
          Marketplace
        </NavLink>
        <NavLink to="/post-item" className={getClass}>
          Post Item
        </NavLink>
        <NavLink to="/account" className={getClass}>
          Your Account
        </NavLink>
        <button className="side-link btn-ghost" onClick={logout}>
          Logout
        </button>
      </nav>
    </aside>
  );
};

export default Sidebar;
