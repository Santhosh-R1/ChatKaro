// SidebarChat.js

import React, { useState } from "react";
import "./SidebarChat.css";
import Avatar from "@mui/material/Avatar";
import { Link } from "react-router-dom";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import axiosInstance from "../../../BaseUrl";
import { motion } from "framer-motion";

const chatItemVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 },
  hover: { scale: 1.03, backgroundColor: "rgba(255, 255, 255, 0.15)" },
};

const dialogSx = {
  "& .MuiBackdrop-root": {
    backgroundColor: "rgba(12, 3, 18, 0.72)",
    backdropFilter: "blur(12px)",
  },
  "& .MuiDialog-paper": {
    width: "90%",
    maxWidth: "430px",
    margin: "16px",
    background: "rgba(32, 12, 44, 0.92)",
    backdropFilter: "blur(25px) saturate(180%)",
    "-webkit-backdrop-filter": "blur(25px) saturate(180%)",
    boxShadow: "0 25px 65px rgba(6, 1, 14, 0.8), 0 0 35px rgba(247, 140, 160, 0.2)",
    border: "1px solid rgba(247, 140, 160, 0.35)",
    borderRadius: "26px",
    color: "#f1f1f1",
    padding: "12px 6px",
    overflow: "hidden",
  },
};

const textFieldSx = {
  "& .MuiInputLabel-root": { color: "rgba(255, 215, 230, 0.7)" }, 
  "& .MuiInputLabel-root.Mui-focused": { color: "#f78ca0" },
  "& .MuiOutlinedInput-root": {
    borderRadius: "14px",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    "& fieldset": { borderColor: "rgba(247, 140, 160, 0.3)" }, 
    "&:hover fieldset": { borderColor: "rgba(247, 140, 160, 0.6)" }, 
    "&.Mui-focused fieldset": { borderColor: "#f78ca0", borderWidth: "2px" }, 
    "& .MuiOutlinedInput-input": { color: "#ffffff" }, 
  },
};

// MODIFIED: Accept the new 'creatorId' prop
function SidebarChat({ addNewChat, name, id, avatar, onDelete, onAddChat, creatorId }) {
  const [isHovered, setIsHovered] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [isAddChatDialogOpen, setIsAddChatDialogOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomAvatar, setNewRoomAvatar] = useState("");

  const handleCreateChatConfirm = async () => {
    // ADDED: A check to ensure creatorId exists before making the API call
    if (!newRoomName.trim() || !creatorId) {
      alert("Cannot create chat. Missing information.");
      return;
    }
    try {
      // MODIFIED: Include creatorId in the request body
      const response = await axiosInstance.post("group/create", { 
        name: newRoomName, 
        avatar: newRoomAvatar,
        creatorId: creatorId 
      });

      if (response.data && response.data.data) {
        onAddChat(response.data.data);
      }
    } catch (error) {
      console.log("Error creating chat room:", error);
      alert("Failed to create chat. Please try again.");
    } finally {
      setIsAddChatDialogOpen(false);
      setNewRoomName("");
      setNewRoomAvatar("");
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await axiosInstance.delete(`room/delete/${id}`);
      onDelete(id);
      setOpenDeleteDialog(false);
    } catch (error) {
      console.error("Failed to delete chat:", error);
      alert("Failed to delete chat. Please try again.");
    }
  };

  if (addNewChat) {
    return (
      <>
        <motion.div
          className="sidebarchat__addNew"
          onClick={() => setIsAddChatDialogOpen(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="sidebarchat__addNewIcon">
            <span>+</span>
          </div>
          <div className="sidebarchat__addNewText">
            <h2>Add New HAIA Chat</h2>
            <p>Start a new private couple room</p>
          </div>
        </motion.div>

        <Dialog open={isAddChatDialogOpen} onClose={() => setIsAddChatDialogOpen(false)} sx={dialogSx}>
          <div className="cuteDialog__icon">
            <span className="cuteDialog__iconMain">💖</span>
            <span className="cuteDialog__iconSub">✨</span>
          </div>
          <DialogTitle className="cuteDialog__title">Create a Couple Room</DialogTitle>
          <div className="cuteDialog__divider">
            <span className="cuteDialog__dividerLine"></span>
            <span className="cuteDialog__dividerHeart">♥</span>
            <span className="cuteDialog__dividerLine"></span>
          </div>
          <DialogContent sx={{ px: "24px", pb: 0 }}>
            <DialogContentText className="cuteDialog__text" sx={{ mb: 2 }}>
              Give your romantic space a sweet name to start chatting with your love. 💌
            </DialogContentText>
            <TextField autoFocus required margin="dense" label="Couple Room Name" placeholder="e.g. My Pookie & Me 💕" type="text" fullWidth variant="outlined" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} sx={textFieldSx}/>
            <TextField margin="dense" label="Avatar URL (Optional)" placeholder="https://..." type="text" fullWidth variant="outlined" value={newRoomAvatar} onChange={(e) => setNewRoomAvatar(e.target.value)} sx={{ ...textFieldSx, mt: 1.5 }} />
          </DialogContent>
          <DialogActions className="cuteDialog__actions">
            <Button onClick={() => setIsAddChatDialogOpen(false)} className="cuteDialog__btnCancel">Cancel</Button>
            <Button onClick={handleCreateChatConfirm} disabled={!newRoomName.trim()} className="cuteDialog__btnCreate">Create Room 💖</Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  return (
    <motion.div
      className="sidebarchat__container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      variants={chatItemVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      transition={{ duration: 0.2 }}
    >
      <Link to={`/rooms/${id}`} className="sidebarchat__link">
        <Avatar src={avatar || undefined} className="sidebarchat__avatar">
          {name ? name.charAt(0).toUpperCase() : "♥"}
        </Avatar>
        <div className="sidebarchat__info">
          <h2>{name}</h2>
          <p className="sidebarchat__preview">♥ Tap to message</p>
        </div>
      </Link>

      <div className="sidebarchat__deleteWrapper">
        <IconButton onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenDeleteDialog(true); }} className="sidebarchat__deleteIcon" aria-label="delete">
          <DeleteIcon />
        </IconButton>
      </div>

      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)} sx={dialogSx}>
        <div className="cuteDialog__icon">
          <span className="cuteDialog__iconMain">🥺</span>
          <span className="cuteDialog__iconSub">💔</span>
        </div>
        <DialogTitle className="cuteDialog__title">Delete this love chat?</DialogTitle>
        <div className="cuteDialog__divider">
          <span className="cuteDialog__dividerLine"></span>
          <span className="cuteDialog__dividerHeart">♥</span>
          <span className="cuteDialog__dividerLine"></span>
        </div>
        <DialogContent sx={{ px: "24px", pb: 0 }}>
          <DialogContentText className="cuteDialog__text">
            Are you sure you want to remove <strong>"{name}"</strong>? All sweet messages and shared memories in this room will be gone forever. 🌸
          </DialogContentText>
        </DialogContent>
        <DialogActions className="cuteDialog__actions">
          <Button onClick={() => setOpenDeleteDialog(false)} className="cuteDialog__btnCancel">Keep Memories 💕</Button>
          <Button onClick={handleDeleteConfirm} className="cuteDialog__btnDelete">Delete Chat 💔</Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
}

export default SidebarChat;