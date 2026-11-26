import React from "react";
import "./Login.css";
import Button from "@mui/material/Button";
import { auth, provider } from "../../firebase";
import { signInWithPopup } from "firebase/auth";
import { useStateValue } from "../ContextApi/StateProvider";
import { actionTypes } from "../ContextApi/reducer";
import { motion } from "framer-motion";
import Emblem from "../../Assets/haia_emblem.svg";

const containerVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
      staggerChildren: 0.15,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

function Login() {
  const [, dispatch] = useStateValue();

  const signIn = () => {
    signInWithPopup(auth, provider)
      .then((result) => {
        if (result.user) {
          dispatch({
            type: actionTypes.SET_USER,
            user: result.user,
          });
        }
      })
      .catch((error) => alert(error.message));
  };

  return (
    <div className="login">
      {/* Ambient Romantic Floating Particles */}
      <div className="login__ambientParticles">
        {[...Array(16)].map((_, i) => (
          <span key={i} className={`particle particle--${(i % 5) + 1}`}></span>
        ))}
      </div>

      {/* Main Classic Glassmorphic Card */}
      <motion.div
        className="login__container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Holding Hands Couple Emblem */}
        <motion.div className="login__emblemWrapper" variants={itemVariants}>
          <img
            src={Emblem}
            alt="HAIA Couple"
            className="login__emblem"
          />
        </motion.div>

        {/* Brand Heading & Romantic Divider */}
        <motion.div className="login__brand" variants={itemVariants}>
          <h1 className="login__title">HAIA</h1>
          <div className="login__divider">
            <span className="login__dividerLine"></span>
            <span className="login__dividerHeart">♥</span>
            <span className="login__dividerLine"></span>
          </div>
          <p className="login__subtitle">Private Romantic Chat for Couples</p>
        </motion.div>

        {/* Premium Google Sign-in Button */}
        <motion.div variants={itemVariants} className="login__buttonWrapper">
          <Button
            onClick={signIn}
            variant="contained"
            className="login__googleBtn"
          >
            <svg className="login__googleIcon" viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google</span>
          </Button>
        </motion.div>

        {/* Private Sanctuary Trust Note */}
        <motion.div variants={itemVariants} className="login__trustBadge">
          <span className="login__lockIcon">🔒</span>
          <span>End-to-End Private &amp; Intimate</span>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default Login;
