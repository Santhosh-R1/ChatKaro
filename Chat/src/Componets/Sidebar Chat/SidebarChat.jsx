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
  "& .MuiDialog-paper": {
    background: "rgba(30, 30, 45, 0.6)",
    backdropFilter: "blur(15px)",
    "-webkit-backdrop-filter": "blur(15px)",
    boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    borderRadius: "15px",
    color: "#f1f1f1",
  },
};

const textFieldSx = {
  "& .MuiInputLabel-root": { color: "#c0c0c0" }, 
  "& .MuiInputLabel-root.Mui-focused": { color: "#f78ca0" },
  "& .MuiOutlinedInput-root": {
    "& fieldset": { borderColor: "rgba(255, 255, 255, 0.3)" }, 
    "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.6)" }, 
    "&.Mui-focused fieldset": { borderColor: "#f78ca0" }, 
    "& .MuiOutlinedInput-input": { color: "#ffffff" }, 
  },
};

function SidebarChat({ addNewChat, name, id, avatar, onDelete, onAddChat }) {
  const [isHovered, setIsHovered] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [isAddChatDialogOpen, setIsAddChatDialogOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomAvatar, setNewRoomAvatar] = useState("");

  const handleCreateChatConfirm = async () => {
    if (!newRoomName.trim()) return;
    try {
      const response = await axiosInstance.post("group/create", { name: newRoomName, avatar: newRoomAvatar });
      if (response.data && response.data.data) onAddChat(response.data.data);
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
          whileHover={{ scale: 1.03, backgroundColor: "rgba(247, 140, 160, 0.2)" }}
        >
          <h2>Add New Pookie Chat</h2>
        </motion.div>

        <Dialog open={isAddChatDialogOpen} onClose={() => setIsAddChatDialogOpen(false)} sx={dialogSx}>
          <DialogTitle>Create a new chat room</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ color: "#c0c0c0", mb: 2 }}>
              Give your new Pookie-space a name.
            </DialogContentText>
            <TextField autoFocus required margin="dense" label="Room Name" type="text" fullWidth variant="outlined" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} sx={textFieldSx}/>
            <TextField margin="dense" label="Avatar URL (Optional)" type="text" fullWidth variant="outlined" value={newRoomAvatar} onChange={(e) => setNewRoomAvatar(e.target.value)} sx={textFieldSx} />
          </DialogContent>
          <DialogActions sx={{ p: "16px 24px" }}>
            <Button onClick={() => setIsAddChatDialogOpen(false)} sx={{ color: '#f1f1f1' }}>Cancel</Button>
            <Button onClick={handleCreateChatConfirm} variant="contained" disabled={!newRoomName.trim()} sx={{ background: "linear-gradient(45deg, #f78ca0 0%, #f9748f 90%)" }}>Create</Button>
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
        <Avatar src={avatar} className="sidebarchat__avatar" />
        <div className="sidebarchat__info">
          <h2>{name}</h2>
        </div>
      </Link>

      {isHovered && (
        <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}>
          <IconButton onClick={(e) => { e.preventDefault(); setOpenDeleteDialog(true); }} className="sidebarchat__deleteIcon" aria-label="delete">
            <DeleteIcon />
          </IconButton>
        </motion.div>
      )}

      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)} sx={dialogSx}>
        <DialogTitle>{"Delete this chat?"}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#c0c0c0" }}>
            Are you sure you want to delete "{name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', p: '16px 24px' }}>
          <Button onClick={() => setOpenDeleteDialog(false)} sx={{ color: '#f1f1f1' }}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" autoFocus sx={{ backgroundColor: '#ff4d6d', '&:hover': { backgroundColor: '#ff3355' } }}>Confirm Delete</Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
}

export default SidebarChat;