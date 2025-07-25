// src/Componets/SideBar/SideBar.jsx

import React, { useEffect, useState } from "react";
import Avatar from "@mui/material/Avatar";
import IconButton from '@mui/material/IconButton';
import LogoutIcon from '@mui/icons-material/Logout';
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import "./SideBar.css"; // We will update this file next
import { useStateValue } from "../ContextApi/StateProvider";
import { actionTypes } from "../ContextApi/reducer";
import SidebarChat from "../Sidebar Chat/SidebarChat";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../BaseUrl";
// Assume LogoutModal is styled similarly to the other dialogs
import LogoutModal from "../LogoutModal/LogoutModal"; 

function SideBar() {
  const navigate = useNavigate();
  const [{ user }, dispatch] = useStateValue();
  const [rooms, setRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    axiosInstance.get(`all/rooms`)
      .then((res) => {
        if (Array.isArray(res.data.data)) {
          setRooms(res.data.data);
        }
      })
      .catch((err) => console.error("Error fetching rooms:", err));
  }, []);

  const handleAddRoom = (newRoom) => {
    setRooms((prevRooms) => [...prevRooms, newRoom]);
  };

  const handleDeleteRoom = (deletedRoomId) => {
    setRooms((prevRooms) => prevRooms.filter((room) => room._id !== deletedRoomId));
    navigate('/');
  };

  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogout = () => {
    dispatch({ type: actionTypes.SET_USER, user: null });
    setIsModalOpen(false);
    navigate("/");
  };

  return (
    <div className="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__headerLeft">
          <Avatar src={user?.photoURL} />
          <div className="sidebar__headerInfo">
            <h4>{user?.displayName}</h4>
          </div>
        </div>
        <div className="sidebar__headerRight">
          {/* Add a className for easier styling and hover effects */}
          <IconButton onClick={() => setIsModalOpen(true)} className="sidebar__logoutButton">
            <LogoutIcon />
          </IconButton>
        </div>
      </div>

      <div className="sidebar__search">
        <div className="sidebar__searchContainer">
          <SearchOutlinedIcon />
          <input
            type="text"
            placeholder="Search or start new chat"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="sidebar__chats">
        <SidebarChat addNewChat onAddChat={handleAddRoom} />
        {filteredRooms.map((room) => (
          <SidebarChat
            key={room._id}
            id={room._id}
            name={room.name}
            avatar={room.avatar}
            onDelete={handleDeleteRoom}
          />
        ))}
      </div>

      {/* This modal should also be styled with the glass theme */}
      <LogoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
}

export default SideBar;