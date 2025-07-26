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
  MusicNote, // <-- ADDED ICON
} from "@mui/icons-material";
import { useStateValue } from "../ContextApi/StateProvider";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useReactMediaRecorder } from "react-media-recorder";
import Picker from "emoji-picker-react";
import WelcomeLogo from "../../Assets/pookie.png";
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import axiosInstance from "../../../BaseUrl";
import MusicSearchModal from "./MusicSearchModal"; // <-- ADDED IMPORT

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
  const [isClearChatDialogOpen, setIsClearChatDialogOpen] = useState(false);

  // --- START: MUSIC FEATURE STATE ---
  const audioRef = useRef(null);
  const [isMusicModalOpen, setIsMusicModalOpen] = useState(false);
  const [currentSong, setCurrentSong] = useState({ url: null, title: null, isPlaying: false });
  // --- END: MUSIC FEATURE STATE ---

  const sendAudio = async (blob) => {
    // ... (existing code is unchanged)
    if (!blob) return;
    const formData = new FormData();
    formData.append("audio", blob, "voice-message.wav");
    formData.append("name", user.displayName);
    formData.append("timestamp", new Date().toISOString());
    formData.append("uid", user.uid);
    formData.append("roomId", roomId);
    try {
      await axiosInstance.post(`messages/new/audio`, formData, {
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

  // Effect for fetching room info and setting up polling
  useEffect(() => {
    if (roomId) {
      axiosInstance.get(`room/${roomId}`).then((res) => {
        setRoomName(res.data?.data?.name);
        setUpdatedAt(res.data?.data?.updatedAt);
        setRoomAvatar(res.data?.data?.avatar);
      });
      setShowSearch(false);
      setSearchQuery("");
      setShowAttachmentMenu(false);
      setShowEmojiPicker(false);
      setShowMoreMenu(false);
      setMessageToDeleteId(null);
      setIsClearChatDialogOpen(false);
    }
  }, [roomId]);

  // Effect for polling messages and music state
  useEffect(() => {
    if (!roomId) return;

    // --- MESSAGE POLLING ---
    const messageInterval = setInterval(() => {
        axiosInstance.get(`messages/${roomId}`).then((res) => {
            const fetchedMessages = Array.isArray(res.data?.message) ? res.data.message : [];
            setMessages(currentMessages => {
                if (JSON.stringify(fetchedMessages) !== JSON.stringify(currentMessages)) {
                    return fetchedMessages;
                }
                return currentMessages;
            });
        }).catch(err => console.error("Polling for messages failed:", err));
    }, 5000);

    // --- MUSIC STATE POLLING ---
    const musicPollInterval = setInterval(() => {
      axiosInstance.get(`/room/${roomId}/music-state`).then(res => {
        const newState = {
          url: res.data.currentSongUrl,
          title: res.data.currentSongTitle,
          isPlaying: res.data.isPlaying,
        };
        // Only update state if it has actually changed to prevent re-renders
        setCurrentSong(oldState => {
          if (JSON.stringify(newState) !== JSON.stringify(oldState)) {
            return newState;
          }
          return oldState;
        });
      });
    }, 3000); // Poll every 3 seconds

    return () => {
      clearInterval(messageInterval);
      clearInterval(musicPollInterval);
    };
  }, [roomId]);

  // Effect to control the audio element based on the currentSong state
  useEffect(() => {
    if (!audioRef.current) return;
    if (currentSong.isPlaying) {
      if (audioRef.current.src !== currentSong.url) {
        audioRef.current.src = currentSong.url;
      }
      audioRef.current.play().catch(e => console.error("Audio play failed:", e));
    } else {
      audioRef.current.pause();
    }
    if (!currentSong.url) {
      audioRef.current.src = "";
    }
  }, [currentSong]);

  // --- START: MUSIC EVENT HANDLERS ---
  const handleMusicEvent = async (eventType, eventData = {}) => {
    if (!roomId) return;
    try {
      await axiosInstance.post(`/room/${roomId}/music-event`, { eventType, eventData });
    } catch (error) {
      console.error(`Error sending music event ${eventType}:`, error);
    }
  };

  const handleSelectSong = (song) => {
    const songData = {
      url: song.preview,
      title: `${song.title} - ${song.artist.name}`,
    };
    setCurrentSong({ ...songData, isPlaying: true });
    handleMusicEvent('play-song', songData);
  };

  const pauseSharedSong = () => {
    setCurrentSong(prev => ({ ...prev, isPlaying: false }));
    handleMusicEvent('pause-song');
  };

  const resumeSharedSong = () => {
    setCurrentSong(prev => ({ ...prev, isPlaying: true }));
    handleMusicEvent('play-song', { url: currentSong.url, title: currentSong.title });
  }

  const stopSharedSong = () => {
    setCurrentSong({ url: null, title: null, isPlaying: false });
    handleMusicEvent('stop-song');
  };
  // --- END: MUSIC EVENT HANDLERS ---
  
  const sendMessage = async (e) => {
    // ... (existing code is unchanged)
    e.preventDefault();
    if (!input.trim() || status === "recording") return;
    setShowEmojiPicker(false);
    const messageToSend = input;
    setInput("");
    await axiosInstance.post(`messages/new`, {
      message: messageToSend,
      name: user.displayName,
      timestamp: new Date().toISOString(),
      uid: user.uid,
      roomId: roomId,
    });
  };

  // ... (All other functions like handleFileSelection, sendLocation, etc. are unchanged)
  const handleFileSelection = () => { setShowAttachmentMenu(false); fileInputRef.current.click(); };
  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return; let messageType = "document"; if (file.type.startsWith("image/")) messageType = "image"; else if (file.type.startsWith("video/")) messageType = "video"; const formData = new FormData(); formData.append("file", file, file.name); formData.append("name", user.displayName); formData.append("timestamp", new Date().toISOString()); formData.append("uid", user.uid); formData.append("roomId", roomId); formData.append("messageType", messageType); try { await axiosInstance.post(`messages/new/file`, formData, { headers: { "Content-Type": "multipart/form-data" }, }); } catch (error) { console.error("Error uploading file:", error); alert("Error uploading file. Please try again."); } e.target.value = null;
  };
  const sendLocation = () => { setShowAttachmentMenu(false); if (!navigator.geolocation) return alert("Geolocation is not supported by your browser."); navigator.geolocation.getCurrentPosition( async (position) => { const { latitude, longitude } = position.coords; try { await axiosInstance.post(`messages/new`, { name: user.displayName, timestamp: new Date().toISOString(), uid: user.uid, roomId: roomId, messageType: "location", location: { lat: latitude, lon: longitude }, }); } catch (error) { console.error("Error sending location:", error); alert("Failed to send your location."); } }, () => alert("Unable to retrieve your location.") ); };
  const handleOpenClearDialog = () => { setShowMoreMenu(false); setIsClearChatDialogOpen(true); };
  const handleCloseClearDialog = () => { setIsClearChatDialogOpen(false); };
  const handleConfirmClearChat = async () => { try { await axiosInstance.delete(`messages/clear/${roomId}`); setMessages([]); } catch (error) { console.error("Error clearing chat:", error); alert("Failed to clear the chat."); } finally { handleCloseClearDialog(); } };
  const handleDeleteMessage = async (msgId) => { try { await axiosInstance.delete(`messages/delete/${msgId}`); setMessages((prev) => prev.filter((message) => message._id !== msgId)); setMessageToDeleteId(null); } catch (error) { console.error("Error deleting message:", error); alert("Failed to delete the message."); } };
  const formatTimestamp = (isoDate) => { if (!isoDate) return ""; return new Date(isoDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true, }); };
  const formatDate = (isoDate) => { if (!isoDate) return ""; const date = new Date(isoDate); const day = String(date.getDate()).padStart(2, '0'); const month = String(date.getMonth() + 1).padStart(2, '0'); const year = date.getFullYear(); return `${day}/${month}/${year}`; };
  const filteredMessages = messages.filter((msg) => { if (!searchQuery) return true; const query = searchQuery.toLowerCase(); return ( (msg.message?.toLowerCase() || "").includes(query) || (msg.fileName?.toLowerCase() || "").includes(query) ); });
  const renderMessageContent = (message) => { /*... (this function is unchanged) ...*/ switch (message.messageType) { case "audio": return <audio src={message.audioUrl} controls className="chat__audioPlayer" />; case "image": return ( <div className="chat__mediaContainer"> <img src={message.fileUrl} alt={message.fileName || "Sent image"} className="chat__mediaImage" /> {message.message && <p className="chat__mediaCaption">{message.message}</p>} </div> ); case "video": return ( <div className="chat__mediaContainer"> <video src={message.fileUrl} controls className="chat__mediaVideo" /> {message.message && <p className="chat__mediaCaption">{message.message}</p>} </div> ); case "document": return ( <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" className="chat__documentLink"> <div className="chat__documentIcon"><Description /></div> <div className="chat__documentInfo"><span>{message.fileName}</span><small>Document</small></div> </a> ); case "location": return message.location ? ( <a href={`https://www.google.com/maps?q=${message.location.lat},${message.location.lon}`} target="_blank" rel="noopener noreferrer" className="chat__locationLink"> <div className="chat__locationIcon"><LocationOn /></div> <div className="chat__locationInfo"><span>Shared Location</span><small>View on Google Maps</small></div> </a> ) : ( <div className="chat__text">Invalid location data</div> ); default: return <div className="chat__text">{message.message}</div>; } };

  if (!roomId) {
    return (
      <div className="chat chat__welcome">
        <img src={WelcomeLogo} alt="Welcome to Pookie Gram" />
        <h1>POOKIE-GRAM</h1>
        <p>Select a chat to start messaging with your favorite pookies.</p>
      </div>
    );
  }

  return (
    <div className="chat">
      <audio ref={audioRef} style={{ display: "none" }} />

      <div className="chat__header">
        <Avatar src={roomAvatar} />
        {showSearch ? (
          <motion.div className="chat__searchContainer" initial={{ width: 0, opacity: 0 }} animate={{ width: "100%", opacity: 1 }}>
            <SearchOutlined />
            <input placeholder="Search messages..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus />
            <IconButton onClick={() => { setShowSearch(false); setSearchQuery(""); }}><Close /></IconButton>
          </motion.div>
        ) : (
          <div className="chat__headerInfo">
            <h3>{roomName}</h3>
            <p>{updatedAt ? `Created on ${formatDate(updatedAt)}` : "..."}</p>
          </div>
        )}
        <div className="chat__headerRight">
          {!showSearch && <IconButton onClick={() => setShowSearch(true)}><SearchOutlined /></IconButton>}

          {/* --- ADDED MUSIC ICON --- */}
          <IconButton onClick={() => setIsMusicModalOpen(true)}>
              <MusicNote />
          </IconButton>

          <div className="chat__attachment">
            <IconButton onClick={() => setShowAttachmentMenu((p) => !p)}><AttachFile /></IconButton>
            <AnimatePresence>
              {showAttachmentMenu && (
                <motion.div className="chat__menu" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
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
                <motion.div className="chat__menu" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
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
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              onDoubleClick={() => message.uid === user.uid && setMessageToDeleteId(message._id)}
            >
              <AnimatePresence>
                {messageToDeleteId === message._id && (
                  <motion.div
                    className="chat__messageDelete"
                    onClick={() => handleDeleteMessage(message._id)}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
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

      {/* --- ADDED MUSIC PLAYER BAR --- */}
      <AnimatePresence>
        {currentSong.url && (
          <motion.div 
            className="chat__musicPlayer"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
          >
            <div className="chat__musicPlayer_info">
                <MusicNote fontSize="small" />
                <span>Now Playing: {currentSong.title}</span>
            </div>
            <div className="chat__musicPlayer_controls">
              {currentSong.isPlaying ? (
                <IconButton onClick={pauseSharedSong}><span className="material-icons">pause</span></IconButton>
              ) : (
                <IconButton onClick={resumeSharedSong}><span className="material-icons">play_arrow</span></IconButton>
              )}
              <IconButton onClick={stopSharedSong}><span className="material-icons">stop</span></IconButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="chat__footer">
        <div className="chat__emoji">
          <IconButton onClick={() => setShowEmojiPicker((p) => !p)}><InsertEmoticon /></IconButton>
          {showEmojiPicker && (
            <div className="chat__emojiPickerContainer">
              <Picker onEmojiClick={(e) => setInput((prev) => prev + e.emoji)} theme="dark" />
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
          <IconButton type="submit" onClick={sendMessage} className="chat__sendButton"><Send /></IconButton>
        ) : (
          <IconButton onClick={status === "recording" ? stopRecording : startRecording}>
            {status === "recording" ? <StopCircle className="chat__mic_recording" /> : <Mic />}
          </IconButton>
        )}
      </div>

      {/* --- ADDED MUSIC MODAL RENDER --- */}
      <MusicSearchModal 
        open={isMusicModalOpen}
        onClose={() => setIsMusicModalOpen(false)}
        onSongSelect={handleSelectSong}
      />

      <Dialog open={isClearChatDialogOpen} onClose={handleCloseClearDialog} sx={dialogSx}>
        <DialogTitle>{"Clear all messages in this chat?"}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#c0c0c0" }}>
            Are you sure you want to permanently delete all messages in "{roomName}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', p: '16px 24px' }}>
          <Button onClick={handleCloseClearDialog} sx={{ color: '#f1f1f1' }}>Cancel</Button>
          <Button onClick={handleConfirmClearChat} variant="contained" autoFocus sx={{ backgroundColor: '#ff4d6d', '&:hover': { backgroundColor: '#ff3355' } }}>
            Clear Chat
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default Chat;