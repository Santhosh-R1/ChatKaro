import React from "react";
import "./LogoutModal.css";

function LogoutModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal__overlay" onClick={onClose}>
      <div className="modal__content" onClick={(e) => e.stopPropagation()}>
        <h2>Logout Confirmation</h2>
        <p>Are you sure you want to logout?</p>
        <div className="modal__buttons">
          <button className="modal__button cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="modal__button confirm" onClick={onConfirm}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default LogoutModal;