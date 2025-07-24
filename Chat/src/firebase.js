import { initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
const firebaseConfig = {
  apiKey: "AIzaSyCM7Frng2r6PaGX7SCdATgXZChEVO9ZhEU",
  authDomain: "mern-whatsapp-2f8f7.firebaseapp.com",
  projectId: "mern-whatsapp-2f8f7",
  storageBucket: "mern-whatsapp-2f8f7.firebasestorage.app",
  messagingSenderId: "52984027103",
  appId: "1:52984027103:web:673fb9e9c9226eece4566a"
};

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const provider = new GoogleAuthProvider()

export { app, auth, provider }