import React from "react";
import "./Login.css"; 
import Button from "@mui/material/Button";
import { auth, provider } from "../../firebase";
import { signInWithPopup } from "firebase/auth";
import { useStateValue } from "../ContextApi/StateProvider";
import { actionTypes } from "../ContextApi/reducer";
import { motion } from "framer-motion";
import Logo from "../../Assets/chat-karo.png"; 
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
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
    },
  },
};

function Login() {
  const [state, dispatch] = useStateValue();

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
      <div className="background-bubbles">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>

      <motion.div
        className="login__container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.img
          src={Logo}
          alt="Talk Karo Logo"
          variants={itemVariants}
        />
        <motion.div className="login__text" variants={itemVariants}>
          <h1>Welcome to Chat Karo</h1>
          <p>Your new favorite way to chat.</p>
        </motion.div>

        <motion.div variants={itemVariants} style={{ width: '100%' }}>
          <Button
            onClick={signIn}
            variant="contained"
            className="login__button"
          >
            Sign in with Google
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default Login;