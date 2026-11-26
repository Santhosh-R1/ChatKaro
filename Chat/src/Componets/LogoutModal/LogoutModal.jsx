import React from "react";
import "./LogoutModal.css";
import { motion, AnimatePresence } from "framer-motion";

function LogoutModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="cuteModal__overlay" onClick={onClose}>
        <motion.div
          className="cuteModal__card"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
        >
          {/* Cute Floating Icon Badge */}
          <div className="cuteModal__iconWrapper cuteModal__icon--logout">
            <span className="cuteModal__iconEmoji">🥺</span>
            <span className="cuteModal__floatingHeart">💔</span>
          </div>

          <h2 className="cuteModal__title">Leaving so soon, my love?</h2>
          
          <div className="cuteModal__divider">
            <span className="cuteModal__dividerLine"></span>
            <span className="cuteModal__dividerHeart">♥</span>
            <span className="cuteModal__dividerLine"></span>
          </div>

          <p className="cuteModal__message">
            Your sweetheart will miss you here in <strong>HAIA</strong>... Are you sure you want to log out for now?
          </p>

          <div className="cuteModal__buttons">
            <button className="cuteModal__btn cuteModal__btn--cancel" onClick={onClose}>
              Stay in Love 💕
            </button>
            <button className="cuteModal__btn cuteModal__btn--confirm" onClick={onConfirm}>
              Yes, Log Out
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default LogoutModal;
