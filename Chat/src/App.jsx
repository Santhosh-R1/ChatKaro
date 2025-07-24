import React from "react";
import Login from "./Componets/Login/Login";
import "./App.css";
import { useStateValue } from "./Componets/ContextApi/StateProvider";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Chat from "./Componets/Chat/Chat";
import SideBar from "./Componets/SideBar/SideBar";

function App() {
  const [{ user }] = useStateValue();

  return (
    <div className="app">
      {!user ? (
        <Login />
      ) : (
        <div className="app__body">
          <Router>
            <SideBar />
            <Routes>
              <Route path="/" element={<Chat />} />
              <Route path="/rooms/:roomId" element={<Chat />} />
            </Routes>
          </Router>
        </div>
      )}
    </div>
  );
}

export default App;