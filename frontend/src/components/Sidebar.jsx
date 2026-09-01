import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import UnreadBadge from './UnreadBadge/UnreadBadge';
import { fetchUnreadConversationSummary } from '../services/conversationService';

const Sidebar = () => {
  const { logout } = useAuth();
  const [unreadConversations, setUnreadConversations] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadUnreadSummary = async () => {
      try {
        const response = await fetchUnreadConversationSummary();

        if (!mounted) {
          return;
        }

        setUnreadConversations(response?.summary?.unreadConversations || 0);
      } catch {
        if (mounted) {
          setUnreadConversations(0);
        }
      }
    };

    loadUnreadSummary();
    const interval = setInterval(loadUnreadSummary, 20000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

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
        <NavLink to="/notifications" className={getClass}>
          Notifications
        </NavLink>
        <NavLink to="/messages" className={getClass}>
          Messages <UnreadBadge count={unreadConversations} />
        </NavLink>
        <NavLink to="/claims/incoming" className={getClass}>
          Incoming Claims
        </NavLink>
        <NavLink to="/claims/me" className={getClass}>
          My Claims
        </NavLink>
        <button className="side-link btn-ghost" onClick={logout}>
          Logout
        </button>
      </nav>
    </aside>
  );
};

export default Sidebar;
