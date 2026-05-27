import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PillNav from '../ui/PillNav';
import { hasCapability } from '../../utils/auth';
import { useAuth } from '../../context/AuthContext';
import './TopNav.css';

const TopNav = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = async () => {
    await logout();
    closeMenu();
    navigate('/login');
  };

  useEffect(() => {
    closeMenu();
  }, [location.pathname]);

  const navItems = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/account', label: 'Profiel' },
    { to: '/activiteiten', label: 'Stempagina' },
    ...(hasCapability(user, 'trainer.sessions.view') ? [{ to: '/trainer', label: 'Trainer' }] : []),
    ...(hasCapability(user, 'admin.users.view') ? [{ to: '/admin', label: 'Admin' }] : []),
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
          <button className="logout-link" onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', font: 'inherit', padding: 0 }}>Uitloggen</button>
        </div>
      </nav>
    </header>
  );
};

export default TopNav;
