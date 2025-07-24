import React, { useEffect, useState, useRef } from "react";
import "./Chat.css";
import { Avatar, IconButton } from "@mui/material";
import {
  SearchOutlined,
  AttachFile,
  MoreVert,
  InsertEmoticon,
  Mic,
  Send,
  StopCircle,
  Close,
  Photo,
  Description,
  LocationOn,
  DeleteForever,
} from "@mui/icons-material";
import axios from "axios";
import { useStateValue } from "../ContextApi/StateProvider";
import { useParams } from "react-router-dom";
import Pusher from "pusher-js";
import { motion, AnimatePresence } from "framer-motion";
import { useReactMediaRecorder } from "react-media-recorder";
import Picker from "emoji-picker-react";
import Welcome from "../../Assets/CHAT KARO.png";

// MUI Dialog components for the confirmation modal
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';

function Chat() {
  const [input, setInput] = useState("");
  const [roomName, setRoomName] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [roomAvatar, setRoomAvatar] = useState("");
  const [messages, setMessages] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [{ user }] = useStateValue();
  const { roomId } = useParams();
  const messagesEndRef = useRef(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [messageToDeleteId, setMessageToDeleteId] = useState(null);
  const fileInputRef = useRef(null);

  // State to control the clear chat confirmation dialog
  const [isClearChatDialogOpen, setIsClearChatDialogOpen] = useState(false);

  const sendAudio = async (blob) => {
    if (!blob) return;
    const formData = new FormData();
    formData.append("audio", blob, "voice-message.wav");
    formData.append("name", user.displayName);
    formData.append("timestamp", new Date().toISOString());
    formData.append("uid", user.uid);
    formData.append("roomId", roomId);
    try {
      await axios.post("http://localhost:5000/messages/new/audio", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } catch (error) {
      console.error("Error uploading audio:", error);
    }
  };

  const { status, startRecording, stopRecording } = useReactMediaRecorder({
    audio: true,
    onStop: (blobUrl, blob) => sendAudio(blob),
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages, searchQuery]);

  useEffect(() => {
    if (roomId) {
      axios.get(`http://localhost:5000/room/${roomId}`).then((res) => {
        setRoomName(res.data?.data.name);
        setUpdatedAt(res.data?.data.updatedAt);
        setRoomAvatar(res.data?.data.avatar);
      });
      axios.get(`http://localhost:5000/messages/${roomId}`).then((res) => {
        setMessages(Array.isArray(res.data?.message) ? res.data.message : []);
      });
      // Reset all UI states when the room changes
      setShowSearch(false);
      setSearchQuery("");
      setShowAttachmentMenu(false);
      setShowEmojiPicker(false);
      setShowMoreMenu(false);
      setMessageToDeleteId(null);
      setIsClearChatDialogOpen(false);
    }
  }, [roomId]);

  useEffect(() => {
    const pusher = new Pusher("f8a113bb8baf5e7d9826", { cluster: "ap2" });
    const channel = pusher.subscribe("message");
    channel.bind("inserted", (newMessage) => {
      if (newMessage.roomId === roomId) {
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      }
    });
    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [roomId]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || status === "recording") return;
    setShowEmojiPicker(false);
    const messageToSend = input;
    setInput("");
    await axios.post("http://localhost:5000/messages/new", {
      message: messageToSend,
      name: user.displayName,
      timestamp: new Date().toISOString(),
      uid: user.uid,
      roomId: roomId,
    });
  };

  const handleFileSelection = () => {
    setShowAttachmentMenu(false);
    fileInputRef.current.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    let messageType = "document";
    if (file.type.startsWith("image/")) messageType = "image";
    else if (file.type.startsWith("video/")) messageType = "video";

    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("name", user.displayName);
    formData.append("timestamp", new Date().toISOString());
    formData.append("uid", user.uid);
    formData.append("roomId", roomId);
    formData.append("messageType", messageType);

    try {
      await axios.post("http://localhost:5000/messages/new/file", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Error uploading file. Please try again.");
    }
    e.target.value = null;
  };

  const sendLocation = () => {
    setShowAttachmentMenu(false);
    if (!navigator.geolocation)
      return alert("Geolocation is not supported by your browser.");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          await axios.post("http://localhost:5000/messages/new", {
            name: user.displayName,
            timestamp: new Date().toISOString(),
            uid: user.uid,
            roomId: roomId,
            messageType: "location",
            location: { lat: latitude, lon: longitude },
          });
        } catch (error) {
          console.error("Error sending location:", error);
          alert("Failed to send your location.");
        }
      },
      () => alert("Unable to retrieve your location.")
    );
  };

  const handleOpenClearDialog = () => {
    setShowMoreMenu(false);
    setIsClearChatDialogOpen(true);
  };

  const handleCloseClearDialog = () => {
    setIsClearChatDialogOpen(false);
  };

  const handleConfirmClearChat = async () => {
    try {
      await axios.delete(`http://localhost:5000/messages/clear/${roomId}`);
      setMessages([]);
    } catch (error) {
      console.error("Error clearing chat:", error);
      alert("Failed to clear the chat.");
    } finally {
      handleCloseClearDialog();
    }
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      await axios.delete(`http://localhost:5000/messages/delete/${msgId}`);
      setMessages((prev) => prev.filter((message) => message._id !== msgId));
      setMessageToDeleteId(null);
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("Failed to delete the message.");
    }
  };

  const formatTimestamp = (isoDate) => {
    if (!isoDate) return "";
    return new Date(isoDate).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (isoDate) => {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); 
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  const filteredMessages = messages.filter((msg) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (msg.message?.toLowerCase() || "").includes(query) ||
      (msg.fileName?.toLowerCase() || "").includes(query)
    );
  });
  
  const renderMessageContent = (message) => {
    switch (message.messageType) {
      case "audio":
        return <audio src={message.audioUrl} controls className="chat__audioPlayer" />;
      case "image":
        return (
          <div className="chat__mediaContainer">
            <img src={message.fileUrl} alt={message.fileName || "Sent image"} className="chat__mediaImage" />
            {message.message && <p className="chat__mediaCaption">{message.message}</p>}
          </div>
        );
      case "video":
        return (
          <div className="chat__mediaContainer">
            <video src={message.fileUrl} controls className="chat__mediaVideo" />
            {message.message && <p className="chat__mediaCaption">{message.message}</p>}
          </div>
        );
      case "document":
        return (
          <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" className="chat__documentLink">
            <div className="chat__documentIcon"><Description /></div>
            <div className="chat__documentInfo"><span>{message.fileName}</span><small>Document</small></div>
          </a>
        );
      case "location":
        return message.location ? (
          <a href={`https://www.google.com/maps?q=${message.location.lat},${message.location.lon}`} target="_blank" rel="noopener noreferrer" className="chat__locationLink">
            <div className="chat__locationIcon"><LocationOn /></div>
            <div className="chat__locationInfo"><span>Location</span><small>View on Google Maps</small></div>
          </a>
        ) : ( <div className="chat__text">Invalid location data</div> );
      default:
        return <div className="chat__text">{message.message}</div>;
    }
  };

  if (!roomId) {
    return (
      <div className="chat chat__welcome">
        <img src={Welcome} alt="Welcome to WhatsApp" />
        <h1>CHAT KARO</h1>
        <p>Send and receive messages without keeping your phone online.</p>
      </div>
    );
  }

  return (
    <div className="chat">
      <div className="chat__header">
        <Avatar src={roomAvatar} />
        {showSearch ? (
          <motion.div className="chat__searchContainer" initial={{ width: 0, opacity: 0 }} animate={{ width: "100%", opacity: 1 }}>
            <IconButton><SearchOutlined /></IconButton>
            <input placeholder="Search messages..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus />
            <IconButton onClick={() => { setShowSearch(false); setSearchQuery(""); }}><Close /></IconButton>
          </motion.div>
        ) : (
          <div className="chat__headerInfo">
            <h3>{roomName}</h3>
            <p>{updatedAt ? `Created at ${formatDate(updatedAt)}` : "..."}</p>
          </div>
        )}
        <div className="chat__headerRight">
          {!showSearch && <IconButton onClick={() => setShowSearch(true)}><SearchOutlined /></IconButton>}
          <div className="chat__attachment">
            <IconButton onClick={() => setShowAttachmentMenu((p) => !p)}><AttachFile /></IconButton>
            <AnimatePresence>
              {showAttachmentMenu && (
                <motion.div className="chat__attachmentMenu" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                  <div onClick={handleFileSelection}><Photo />Photos & Videos</div>
                  <div onClick={handleFileSelection}><Description />Document</div>
                  <div onClick={sendLocation}><LocationOn />Location</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="chat__more">
            <IconButton onClick={() => setShowMoreMenu((p) => !p)}><MoreVert /></IconButton>
            <AnimatePresence>
              {showMoreMenu && (
                <motion.div className="chat__moreMenu" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                  <div onClick={handleOpenClearDialog}><DeleteForever />Clear all chat</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileUpload} accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />

      <div className="chat__body" onClick={() => { setShowAttachmentMenu(false); setShowEmojiPicker(false); setShowMoreMenu(false); setMessageToDeleteId(null); }}>
        <AnimatePresence>
          {filteredMessages.map((message) => (
            <motion.div
              layout
              key={message._id}
              className={`chat__message ${message.uid === user.uid && "chat__receiver"}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onDoubleClick={() => {
                if (message.uid === user.uid) {
                  setMessageToDeleteId(message._id);
                }
              }}
            >
              <AnimatePresence>
                {messageToDeleteId === message._id && (
                  <motion.div
                    className="chat__messageDelete"
                    onClick={() => handleDeleteMessage(message._id)}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.15, ease: "easeIn" }}
                  >
                    <DeleteForever />
                  </motion.div>
                )}
              </AnimatePresence>

              {message.uid !== user.uid && <span className="chat__name">{message.name}</span>}
              <div className="chat__messageContent">
                {renderMessageContent(message)}
                <span className="chat__timestamp">{formatTimestamp(message.timestamp)}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <div className="chat__footer">
        <div className="chat__emoji">
          <IconButton onClick={() => setShowEmojiPicker((p) => !p)}><InsertEmoticon /></IconButton>
          {showEmojiPicker && (
            <div className="chat__emojiPickerContainer">
              <Picker onEmojiClick={(e) => setInput((prev) => prev + e.emoji)} />
            </div>
          )}
        </div>
        <form onSubmit={sendMessage}>
          <input type="text" placeholder={status === "recording" ? "Recording..." : "Type a message"} value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => { setShowEmojiPicker(false); setShowAttachmentMenu(false); setShowMoreMenu(false); setMessageToDeleteId(null); }}
            disabled={status === "recording"}
          />
        </form>
        {input ? (
          <IconButton type="submit" onClick={sendMessage}><Send /></IconButton>
        ) : (
          <IconButton onClick={status === "recording" ? stopRecording : startRecording}>
            {status === "recording" ? <StopCircle className="chat__mic_recording" /> : <Mic />}
          </IconButton>
        )}
      </div>

      {/* Confirmation Dialog for Clearing Chat */}
      <Dialog
        open={isClearChatDialogOpen}
        onClose={handleCloseClearDialog}
        aria-labelledby="clear-chat-dialog-title"
        aria-describedby="clear-chat-dialog-description"
        PaperProps={{ style: { borderRadius: '12px' } }}
      >
        <DialogTitle id="clear-chat-dialog-title" sx={{ textAlign: 'center', pt: 3 }}>
          {"Clear all messages in this chat?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="clear-chat-dialog-description" sx={{ textAlign: 'center' }}>
            Are you sure you want to permanently delete all messages in "{roomName}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', p: '16px 24px' }}>
          <Button onClick={handleCloseClearDialog} color="primary">Cancel</Button>
          <Button onClick={handleConfirmClearChat} color="error" variant="contained" autoFocus>
            Clear Chat
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default Chat;