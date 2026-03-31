import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PillNav from '../ui/PillNav';
import { clearSession, getStoredUser } from '../../utils/auth';
import './TopNav.css';

const TopNav = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [role, setRole] = useState('customer');
  const location = useLocation();

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    clearSession();
    closeMenu();
  };

  useEffect(() => {
    const user = getStoredUser();
    setRole(user?.role || 'customer');
  }, [location.pathname]);

  useEffect(() => {
    closeMenu();
  }, [location.pathname]);

  const navItems = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/account', label: 'Profiel' },
    { to: '/activiteiten', label: 'Stempagina' },
    ...((role === 'trainer' || role === 'admin') ? [{ to: '/trainer', label: 'Trainer' }] : []),
    ...(role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []),
  ];

  return (
    <header className="top-nav-wrap">
      <nav className="top-nav">
        <Link className="brand" to="/dashboard" onClick={closeMenu}>SportPortal</Link>

        <button
          type="button"
          className="hamburger"
          aria-expanded={menuOpen}
          aria-controls="main-menu"
          aria-label={menuOpen ? 'Sluit menu' : 'Open menu'}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          Menu
        </button>

        <div id="main-menu" className={`menu ${menuOpen ? 'open' : ''}`}>
          <PillNav items={navItems} activePath={location.pathname} />
          <Link className="logout-link" to="/login" onClick={handleLogout}>Uitloggen</Link>
        </div>
      </nav>
    </header>
  );
};

export default TopNav;
