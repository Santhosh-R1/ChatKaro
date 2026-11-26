import React from "react";
import Login from "./Componets/Login/Login";
import "./App.css"; // Styles for the app layout
import "./index.css"; // <-- IMPORT THE GLOBAL ANIMATED BACKGROUND STYLES
import { useStateValue } from "./Componets/ContextApi/StateProvider";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Chat from "./Componets/Chat/Chat";
import SideBar from "./Componets/SideBar/SideBar";

function MainApp() {
  const location = useLocation();
  const isChatActive = location.pathname.startsWith("/rooms/");

  return (
    <div className={`app__body ${isChatActive ? "app__body--chat-active" : "app__body--sidebar-active"}`}>
      <SideBar />
      <Routes>
        <Route path="/" element={<Chat />} />
        <Route path="/rooms/:roomId" element={<Chat />} />
      </Routes>
    </div>
  );
}

function App() {
  const [{ user }] = useStateValue();

  return (
    <Router>
      <div className="app">
        {!user ? <Login /> : <MainApp />}
      </div>
    </Router>
  );
}

export default App;