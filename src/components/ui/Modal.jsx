import React from 'react';
import './Modal.css';

const Modal = ({ isOpen, onClose, title, children, actions }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </header>
        <div className="modal-body">
          {children}
        </div>
        {actions && (
          <footer className="modal-footer">
            {actions}
          </footer>
        )}
      </div>
    </div>
  );
};

export default Modal;
