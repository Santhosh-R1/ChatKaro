import React, { useState } from "react";
import "./SidebarChat.css";
import Avatar from "@mui/material/Avatar";
import axios from "axios";
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

function SidebarChat({ addNewChat, name, id, avatar, onDelete }) {
  const [isHovered, setIsHovered] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const [isAddChatDialogOpen, setIsAddChatDialogOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomAvatar, setNewRoomAvatar] = useState("");


  const handleOpenAddChatDialog = () => {
    setIsAddChatDialogOpen(true);
  };

  const handleCloseAddChatDialog = () => {
    setIsAddChatDialogOpen(false);
    setNewRoomName("");
    setNewRoomAvatar("");
  };

  const handleCreateChatConfirm = async () => {
    if (!newRoomName.trim()) {
      return;
    }
    try {
      await axios.post("http://localhost:5000/group/create", {
        name: newRoomName,
        avatar: newRoomAvatar,
      });
    } catch (error) {
      console.log("Error creating chat room:", error);
    } finally {
      handleCloseAddChatDialog();
    }
  };


  const handleOpenDeleteDialog = (e) => {
    e.preventDefault(); 
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  const handleDeleteConfirm = async () => {
    try {
      await axios.delete(`http://localhost:5000/room/delete/${id}`);
      onDelete(id);
      handleCloseDeleteDialog();
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  if (addNewChat) {
    return (
      <>
        <div className="sidebarchat sidebarchat__addNew" onClick={handleOpenAddChatDialog}>
          <h2>Add New Chat</h2>
        </div>

        <Dialog open={isAddChatDialogOpen} onClose={handleCloseAddChatDialog}>
          <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>Create a new chat room</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2, textAlign: 'center' }}>
              Please enter a name for your new room. An avatar image is optional.
            </DialogContentText>
            <TextField
              autoFocus
              required
              margin="dense"
              id="name"
              label="Room Name"
              type="text"
              fullWidth
              variant="outlined"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
            />
            <TextField
              margin="dense"
              id="avatar"
              label="Avatar Image URL (Optional)"
              type="text"
              fullWidth
              variant="outlined"
              value={newRoomAvatar}
              onChange={(e) => setNewRoomAvatar(e.target.value)}
            />
          </DialogContent>
          <DialogActions sx={{ p: '16px 24px' }}>
            <Button onClick={handleCloseAddChatDialog}>Cancel</Button>
            <Button 
              onClick={handleCreateChatConfirm} 
              variant="contained" 
              disabled={!newRoomName.trim()}
            >
              Create
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  } else {
    return (
      <div
        className="sidebarchat__container"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Link to={`/rooms/${id}`} className="sidebarchat__link">
          <Avatar src={avatar} className="sidebarchat__avatar" />
          <div className="sidebarchat__info">
            <h2>{name}</h2>
          </div>
        </Link>

        {isHovered && (
          <IconButton
            onClick={handleOpenDeleteDialog}
            className="sidebarchat__deleteIcon"
            aria-label="delete"
          >
            <DeleteIcon />
          </IconButton>
        )}

        <Dialog
          open={openDeleteDialog}
          onClose={handleCloseDeleteDialog}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title" sx={{ textAlign: 'center' }}>
            {"Delete this chat?"}
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description" sx={{ textAlign: 'center' }}>
              Are you sure you want to permanently delete "{name}"? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center' }}>
            <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained" autoFocus>
              Confirm Delete
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  }
}

export default SidebarChat;