import React, { useEffect, useState, useRef } from "react";
import "./Chat.css";
import { Avatar, IconButton } from "@mui/material";
import {
  SearchOutlined, AttachFile, MoreVert, InsertEmoticon, Mic, Send, StopCircle, Close, Photo, Description,
  LocationOn, DeleteForever, MusicNote, Pause, PlayArrow, Stop,
  Videocam,      // Video call icon
  CallEnd,       // Hang-up icon
  Phone,         // Answer icon
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
import MusicSearchModal from "./MusicSearchModal";

// --- WebRTC & Socket.IO Imports ---
import io from 'socket.io-client';
import Peer from 'simple-peer';

// --- Socket.IO Connection & Styling ---
// IMPORTANT: Replace with your actual deployed server URL in production
const socket = io('http://localhost:5000');

const dialogSx = {
  "& .MuiDialog-paper": {
    background: "rgba(30, 30, 45, 0.6)", backdropFilter: "blur(15px)",
    "-webkit-backdrop-filter": "blur(15px)", boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
    border: "1px solid rgba(255, 255, 255, 0.18)", borderRadius: "15px", color: "#f1f1f1",
  },
};

function Chat() {
  // --- Component State ---
  const [input, setInput] = useState("");
  const [roomName, setRoomName] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [roomAvatar, setRoomAvatar] = useState("");
  const [messages, setMessages] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [{ user }] = useStateValue();
  const { roomId } = useParams();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [messageToDeleteId, setMessageToDeleteId] = useState(null);
  const [isClearChatDialogOpen, setIsClearChatDialogOpen] = useState(false);
  const [isMusicModalOpen, setIsMusicModalOpen] = useState(false);
  const [currentSong, setCurrentSong] = useState({ url: null, title: null, isPlaying: false });

  // --- Refs ---
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);

  // --- Video Call State & Refs ---
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState(""); // The caller's socket ID
  const [callerName, setCallerName] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(true); // Start as ended
  const [otherUser, setOtherUser] = useState(null); // The UID of the person being called
  const myVideo = useRef();
  const partnerVideo = useRef();
  const connectionRef = useRef();

  // =================================================================
  // --- CORE MESSAGING & MEDIA FUNCTIONS ---
  // =================================================================

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendAudio = async (blob) => {
    if (!blob) return;
    const formData = new FormData();
    formData.append("audio", blob, "voice-message.wav");
    formData.append("name", user.displayName);
    formData.append("timestamp", new Date().toISOString());
    formData.append("uid", user.uid);
    formData.append("roomId", roomId);
    try {
      await axiosInstance.post(`messages/new/audio`, formData, { headers: { "Content-Type": "multipart/form-data" } });
    } catch (error) {
      console.error("Error uploading audio:", error);
    }
  };

  const { status, startRecording, stopRecording } = useReactMediaRecorder({ audio: true, onStop: (blobUrl, blob) => sendAudio(blob) });

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || status === "recording") return;
    setShowEmojiPicker(false);
    const messageToSend = input;
    setInput("");
    await axiosInstance.post(`messages/new`, {
      message: messageToSend, name: user.displayName, timestamp: new Date().toISOString(), uid: user.uid, roomId: roomId,
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return; let messageType = "document"; if (file.type.startsWith("image/")) messageType = "image"; else if (file.type.startsWith("video/")) messageType = "video"; const formData = new FormData(); formData.append("file", file, file.name); formData.append("name", user.displayName); formData.append("timestamp", new Date().toISOString()); formData.append("uid", user.uid); formData.append("roomId", roomId); formData.append("messageType", messageType); try { await axiosInstance.post(`messages/new/file`, formData, { headers: { "Content-Type": "multipart/form-data" }, }); } catch (error) { console.error("Error uploading file:", error); alert("Error uploading file. Please try again."); } e.target.value = null;
  };
  
  const sendLocation = () => {
    setShowAttachmentMenu(false); if (!navigator.geolocation) return alert("Geolocation is not supported by your browser."); navigator.geolocation.getCurrentPosition(async (position) => { const { latitude, longitude } = position.coords; try { await axiosInstance.post(`messages/new`, { name: user.displayName, timestamp: new Date().toISOString(), uid: user.uid, roomId: roomId, messageType: "location", location: { lat: latitude, lon: longitude }, }); } catch (error) { console.error("Error sending location:", error); alert("Failed to send your location."); } }, () => alert("Unable to retrieve your location."));
  };

  const handleDeleteMessage = async (msgId) => {
    try { await axiosInstance.delete(`messages/delete/${msgId}`); setMessages((prev) => prev.filter((message) => message._id !== msgId)); setMessageToDeleteId(null); } catch (error) { console.error("Error deleting message:", error); alert("Failed to delete the message."); }
  };

  const handleConfirmClearChat = async () => {
    try { await axiosInstance.delete(`messages/clear/${roomId}`); setMessages([]); } catch (error) { console.error("Error clearing chat:", error); alert("Failed to clear the chat."); } finally { setIsClearChatDialogOpen(false); }
  };

  // =================================================================
  // --- MUSIC PLAYER FUNCTIONS ---
  // =================================================================
  
  const handleMusicEvent = async (eventType, eventData = {}) => {
    if (!roomId) return; try { await axiosInstance.post(`/room/${roomId}/music-event`, { eventType, eventData }); } catch (error) { console.error(`Error sending music event '${eventType}':`, error); }
  };

  const handleSelectSong = (song) => {
    if (!song || !song.preview_url) { alert("Sorry, a preview is not available for this song."); return; }
    const artistNames = song.artists.map(artist => artist.name).join(', '); const songData = { url: song.preview_url, title: `${song.name} - ${artistNames}` }; setCurrentSong({ ...songData, isPlaying: true }); handleMusicEvent('play-song', songData);
  };

  const pauseSharedSong = () => { setCurrentSong(prev => ({ ...prev, isPlaying: false })); handleMusicEvent('pause-song'); };
  const resumeSharedSong = () => { if (currentSong.url) { setCurrentSong(prev => ({ ...prev, isPlaying: true })); handleMusicEvent('play-song', { url: currentSong.url, title: currentSong.title }); }};
  const stopSharedSong = () => { setCurrentSong({ url: null, title: null, isPlaying: false }); handleMusicEvent('stop-song'); };

  // =================================================================
  // --- VIDEO CALL FUNCTIONS ---
  // =================================================================

  const callUser = (idToCall) => {
    if (!stream) { alert("Your camera is not available. Please allow camera access."); return; }
    
    setCallEnded(false);
    const peer = new Peer({ initiator: true, trickle: false, stream: stream });

    peer.on("signal", (data) => {
      socket.emit("call-user", { userToCall: idToCall, signalData: data, from: socket.id, name: user.displayName });
    });

    peer.on("stream", (partnerStream) => {
      if (partnerVideo.current) partnerVideo.current.srcObject = partnerStream;
    });

    socket.on("call-accepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });
    
    peer.on('close', leaveCall);
    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);
    setReceivingCall(false);
    setCallEnded(false);
    
    const peer = new Peer({ initiator: false, trickle: false, stream: stream });
    
    peer.on("signal", (data) => {
      socket.emit("answer-call", { signal: data, to: caller });
    });

    peer.on("stream", (partnerStream) => {
      if (partnerVideo.current) partnerVideo.current.srcObject = partnerStream;
    });

    peer.on('close', leaveCall);
    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    setReceivingCall(false);
    setCallAccepted(false);
    if (connectionRef.current) {
      socket.emit("end-call", { to: caller });
      connectionRef.current.destroy();
    }
  };

  // =================================================================
  // --- USEEFFECT HOOKS ---
  // =================================================================

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        if (myVideo.current) myVideo.current.srcObject = currentStream;
      }).catch(err => console.log("Error getting media stream:", err));

    if (user?.uid) socket.emit("register-user", user.uid);

    socket.on("hey-im-calling", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerName(data.name);
      setCallerSignal(data.signal);
    });

    socket.on("call-ended", () => {
      setCallEnded(true);
      setReceivingCall(false);
      if (connectionRef.current) connectionRef.current.destroy();
    });

    return () => {
      socket.off("hey-im-calling");
      socket.off("call-ended");
    };
  }, [user.uid]);

  useEffect(() => {
    if (roomId) {
      axiosInstance.get(`room/${roomId}`).then((res) => {
        setRoomName(res.data?.data?.name);
        setUpdatedAt(res.data?.data?.updatedAt);
        setRoomAvatar(res.data?.data?.avatar);
      });
      setShowSearch(false); setSearchQuery(""); setShowAttachmentMenu(false);
      setShowEmojiPicker(false); setShowMoreMenu(false); setMessageToDeleteId(null);
      leaveCall();
    }
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    const fetchMessages = () => {
      axiosInstance.get(`messages/${roomId}`).then((res) => {
        const fetchedMessages = Array.isArray(res.data?.message) ? res.data.message : [];
        setMessages(currentMessages => JSON.stringify(fetchedMessages) !== JSON.stringify(currentMessages) ? fetchedMessages : currentMessages);
        const other = fetchedMessages.find(m => m.uid !== user.uid);
        setOtherUser(other ? other.uid : null);
      }).catch(err => console.error("Polling for messages failed:", err));
    };
    const fetchMusicState = () => {
      axiosInstance.get(`/room/${roomId}/music-state`).then(res => {
        const newState = { url: res.data.currentSongUrl, title: res.data.currentSongTitle, isPlaying: res.data.isPlaying };
        setCurrentSong(oldState => JSON.stringify(newState) !== JSON.stringify(oldState) ? newState : oldState);
      }).catch(err => console.error("Polling for music state failed:", err));
    };
    fetchMessages();
    fetchMusicState();
    const messageInterval = setInterval(fetchMessages, 5000);
    const musicPollInterval = setInterval(fetchMusicState, 3000);
    return () => { clearInterval(messageInterval); clearInterval(musicPollInterval); };
  }, [roomId, user.uid]);

  useEffect(scrollToBottom, [messages, searchQuery]);

  useEffect(() => {
    const audio = audioRef.current; if (!audio) return;
    if (currentSong.isPlaying && currentSong.url) { if (audio.src !== currentSong.url) { audio.src = currentSong.url; } audio.play().catch(e => console.error("Audio play failed.", e)); } else { audio.pause(); } if (!currentSong.url) { audio.src = ""; }
  }, [currentSong]);

  // =================================================================
  // --- UTILITY & RENDER FUNCTIONS ---
  // =================================================================
  const filteredMessages = messages.filter((msg) => { if (!searchQuery) return true; const query = searchQuery.toLowerCase(); return ((msg.message?.toLowerCase() || "").includes(query) || (msg.fileName?.toLowerCase() || "").includes(query)); });
  const formatTimestamp = (isoDate) => { if (!isoDate) return ""; return new Date(isoDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true, }); };
  const formatDate = (isoDate) => { if (!isoDate) return ""; const date = new Date(isoDate); const day = String(date.getDate()).padStart(2, '0'); const month = String(date.getMonth() + 1).padStart(2, '0'); const year = date.getFullYear(); return `${day}/${month}/${year}`; };
  const renderMessageContent = (message) => { switch (message.messageType) { case "audio": return <audio src={message.audioUrl} controls className="chat__audioPlayer" />; case "image": return ( <div className="chat__mediaContainer"> <img src={message.fileUrl} alt={message.fileName || "Sent image"} className="chat__mediaImage" /> {message.message && <p className="chat__mediaCaption">{message.message}</p>} </div> ); case "video": return ( <div className="chat__mediaContainer"> <video src={message.fileUrl} controls className="chat__mediaVideo" /> {message.message && <p className="chat__mediaCaption">{message.message}</p>} </div> ); case "document": return ( <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" className="chat__documentLink"> <div className="chat__documentIcon"><Description /></div> <div className="chat__documentInfo"><span>{message.fileName}</span><small>Document</small></div> </a> ); case "location": return message.location ? ( <a href={`https://www.google.com/maps?q=${message.location.lat},${message.location.lon}`} target="_blank" rel="noopener noreferrer" className="chat__locationLink"> <div className="chat__locationIcon"><LocationOn /></div> <div className="chat__locationInfo"><span>Shared Location</span><small>View on Maps</small></div> </a> ) : ( <div className="chat__text">Invalid location data</div> ); default: return <div className="chat__text">{message.message}</div>; } };

  // =================================================================
  // --- JSX RENDER ---
  // =================================================================

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
      <audio ref={audioRef} style={{ display: "none" }} onEnded={stopSharedSong} />
      
      {/* --- HEADER --- */}
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
          {/* --- VIDEO CALL BUTTON: Renders only when not searching, another user exists, and a call is not active --- */}
          {!showSearch && otherUser && callEnded && (
            <IconButton onClick={() => callUser(otherUser)} title={`Call ${roomName}`}>
              <Videocam />
            </IconButton>
          )}

          {!showSearch && <IconButton onClick={() => setShowSearch(true)}><SearchOutlined /></IconButton>}
          <IconButton onClick={() => setIsMusicModalOpen(true)}><MusicNote /></IconButton>
          <div className="chat__attachment">
            <IconButton onClick={() => setShowAttachmentMenu((p) => !p)}><AttachFile /></IconButton>
            <AnimatePresence>
              {showAttachmentMenu && (
                <motion.div className="chat__menu" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                  <div onClick={() => {fileInputRef.current.click(); setShowAttachmentMenu(false);}}><Photo />Photos & Videos</div>
                  <div onClick={() => {fileInputRef.current.click(); setShowAttachmentMenu(false);}}><Description />Document</div>
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
                  <div onClick={() => {setIsClearChatDialogOpen(true); setShowMoreMenu(false);}}><DeleteForever />Clear all chat</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      
      {/* --- VIDEO CALL UI OVERLAYS --- */}
      <AnimatePresence>
        {callAccepted && !callEnded && (
          <motion.div className="video-call-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="video-wrapper">
              <video playsInline ref={partnerVideo} autoPlay className="partner-video" />
              <video playsInline muted ref={myVideo} autoPlay className="my-video" />
            </div>
            <div className="video-call-controls">
                <IconButton onClick={leaveCall} className="hang-up-button"><CallEnd /></IconButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {receivingCall && !callAccepted && (
          <motion.div className="incoming-call-notification" initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }}>
            <Avatar sx={{ mr: 2 }} />
            <div className="incoming-call-info">
              <p>{callerName || 'Someone'} is calling...</p>
              <div className="incoming-call-actions">
                <Button variant="contained" color="success" startIcon={<Phone />} onClick={answerCall}>Answer</Button>
                <Button variant="contained" color="error" startIcon={<CallEnd />} onClick={leaveCall} sx={{ ml: 2 }}>Decline</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* --- FILE INPUT & CHAT BODY --- */}
      <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileUpload} accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />
      <div className="chat__body" onClick={() => { setShowAttachmentMenu(false); setShowEmojiPicker(false); setShowMoreMenu(false); setMessageToDeleteId(null); }}>
        <AnimatePresence>
          {filteredMessages.map((message) => (
            <motion.div layout key={message._id} className={`chat__message ${message.uid === user.uid && "chat__receiver"}`} initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3, ease: "easeOut" }} onDoubleClick={() => message.uid === user.uid && setMessageToDeleteId(message._id)}>
              <AnimatePresence>
                {messageToDeleteId === message._id && (
                  <motion.div className="chat__messageDelete" onClick={() => handleDeleteMessage(message._id)} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                    <DeleteForever />
                  </motion.div>
                )}
              </AnimatePresence>
              {message.uid !== user.uid && <span className="chat__name">{message.name}</span>}
              <div className="chat__messageContent">{renderMessageContent(message)}<span className="chat__timestamp">{formatTimestamp(message.timestamp)}</span></div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* --- MUSIC PLAYER & FOOTER --- */}
      <AnimatePresence>
        {currentSong.url && (
          <motion.div className="chat__musicPlayer" initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
            <div className="chat__musicPlayer_info">
                <MusicNote fontSize="small" />
                <span title={currentSong.title}>{currentSong.title}</span>
            </div>
            <div className="chat__musicPlayer_controls">
              {currentSong.isPlaying ? (<IconButton onClick={pauseSharedSong} title="Pause"><Pause /></IconButton>) : (<IconButton onClick={resumeSharedSong} title="Play"><PlayArrow /></IconButton>)}
              <IconButton onClick={stopSharedSong} title="Stop"><Stop /></IconButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="chat__footer">
        <div className="chat__emoji">
          <IconButton onClick={() => setShowEmojiPicker((p) => !p)}><InsertEmoticon /></IconButton>
          {showEmojiPicker && (<div className="chat__emojiPickerContainer"><Picker onEmojiClick={(e) => setInput((p) => p + e.emoji)} theme="dark" /></div>)}
        </div>
        <form onSubmit={sendMessage}>
          <input type="text" placeholder={status === "recording" ? "Recording..." : "Type a message"} value={input} onChange={(e) => setInput(e.target.value)} onFocus={() => { setShowEmojiPicker(false); setShowAttachmentMenu(false); setShowMoreMenu(false); }} disabled={status === "recording"} />
        </form>
        {input ? (<IconButton type="submit" onClick={sendMessage} className="chat__sendButton"><Send /></IconButton>) : (<IconButton onClick={status === "recording" ? stopRecording : startRecording}>{status === "recording" ? <StopCircle className="chat__mic_recording" /> : <Mic />}</IconButton>)}
      </div>

      {/* --- MODALS & DIALOGS --- */}
      <MusicSearchModal open={isMusicModalOpen} onClose={() => setIsMusicModalOpen(false)} onSongSelect={handleSelectSong}/>
      <Dialog open={isClearChatDialogOpen} onClose={() => setIsClearChatDialogOpen(false)} sx={dialogSx}>
        <DialogTitle>{"Clear all messages in this chat?"}</DialogTitle>
        <DialogContent><DialogContentText sx={{ color: "#c0c0c0" }}>Are you sure you want to permanently delete all messages in "{roomName}"? This action cannot be undone.</DialogContentText></DialogContent>
        <DialogActions sx={{ justifyContent: 'center', p: '16px 24px' }}><Button onClick={() => setIsClearChatDialogOpen(false)} sx={{ color: '#f1f1f1' }}>Cancel</Button><Button onClick={handleConfirmClearChat} variant="contained" autoFocus sx={{ backgroundColor: '#ff4d6d', '&:hover': { backgroundColor: '#ff3355' } }}>Clear Chat</Button></DialogActions>
      </Dialog>
    </div>
  );
}

export default Chat;