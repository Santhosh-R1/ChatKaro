import React, { useEffect, useState } from "react";
import Avatar from "@mui/material/Avatar";
import IconButton from '@mui/material/IconButton'; 
import LogoutIcon from '@mui/icons-material/Logout';
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import "./SideBar.css";
import { useStateValue } from "../ContextApi/StateProvider";
import { actionTypes } from "../ContextApi/reducer";
import SidebarChat from "../Sidebar Chat/SidebarChat";
import LogoutModal from "../LogoutModal/LogoutModal"; 
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../BaseUrl";

function SideBar() {
  const Navigate = useNavigate();
  const [{ user }, dispatch] = useStateValue();
  const [rooms, setRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch initial rooms on component mount
  useEffect(() => {
    axiosInstance.get(`all/rooms`).then((res) => {
        if (Array.isArray(res.data.data)) {
            setRooms(res.data.data);
        }
    }).catch((err) => console.error("Error fetching rooms:", err));
  }, []);

  // Handler to add a new room to the state instantly
  const handleAddRoom = (newRoom) => {
    setRooms((prevRooms) => [...prevRooms, newRoom]);
  };

  // Handler to remove a deleted room from the state instantly
  const handleDeleteRoom = (deletedRoomId) => {
    setRooms((prevRooms) => prevRooms.filter((room) => room._id !== deletedRoomId));
    // Optional: Navigate away if the deleted room is the currently active one
    Navigate('/');
  };

  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogout = () => {
    // Clear local/session storage if you store tokens there
    localStorage.removeItem("user-token"); // Example
    dispatch({
      type: actionTypes.SET_USER,
      user: null,
    });
    setIsModalOpen(false); 
    Navigate("/"); // Navigate after state update
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
          <IconButton onClick={() => setIsModalOpen(true)}>
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
        {/* Pass the handler function as a prop */}
        <SidebarChat addNewChat onAddChat={handleAddRoom} />
        
        {filteredRooms.map((room) => (
          <SidebarChat
            key={room._id}
            id={room._id}
            name={room.name}
            avatar={room.avatar}
            onDelete={handleDeleteRoom} // This already works correctly
          />
        ))}
      </div>

      <LogoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
}

export default SideBar;