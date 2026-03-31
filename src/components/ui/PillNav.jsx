import React from 'react';
import { Link } from 'react-router-dom';
import './PillNav.css';

const PillNav = ({ items, activePath, className = '' }) => {
  return (
    <div className={`pill-nav ${className}`.trim()} role="navigation" aria-label="Hoofdmenu">
      {items.map((item) => {
        const isActive = activePath === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`pill-nav-item ${isActive ? 'active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
};

export default PillNav;
