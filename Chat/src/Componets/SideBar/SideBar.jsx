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
import axios from "axios";
import Pusher from "pusher-js";
import { useNavigate } from "react-router-dom";

function SideBar() {
  const Navigate = useNavigate();
  const [{ user }, dispatch] = useStateValue();
  const [rooms, setRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    axios.get("http://localhost:5000/all/rooms").then((res) => {
        if (Array.isArray(res.data.data)) {
            setRooms(res.data.data);
        }
    }).catch((err) => console.error("Error fetching rooms:", err));
  }, []);

  const handleDeleteRoom = (deletedRoomId) => {
    setRooms((prevRooms) => prevRooms.filter((room) => room._id !== deletedRoomId));
  };

  useEffect(() => {
    const pusher = new Pusher("f8a113bb8baf5e7d9826", { cluster: "ap2" });
    const channel = pusher.subscribe("room");
    channel.bind("inserted", (newRoom) => setRooms((prevRooms) => [...prevRooms, newRoom]));
    channel.bind("deleted", (deletedRoom) => handleDeleteRoom(deletedRoom.id));

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, []);


  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogout = () => {
    Navigate("/")
    dispatch({
      type: actionTypes.SET_USER,
      user: null,
    });
    setIsModalOpen(false); 
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
        <SidebarChat addNewChat />
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

      <LogoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
}

export default SideBar;