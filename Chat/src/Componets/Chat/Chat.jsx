
import React, { useEffect, useState, useRef } from "react";
import "./Chat.css";
import { Avatar, IconButton } from "@mui/material";
import { SearchOutlined, AttachFile, MoreVert, InsertEmoticon, Mic, Send, StopCircle, Close, Photo, Description, LocationOn, DeleteForever, MusicNote, Pause, PlayArrow, Stop, Videocam, CallEnd, Phone, PhoneDisabled } from "@mui/icons-material";
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
import Peer from "simple-peer/simplepeer.min.js"; 
import io from "socket.io-client";

const socket = io("http://localhost:5000"); 

const dialogSx = { "& .MuiDialog-paper": { background: "rgba(30, 30, 45, 0.6)", backdropFilter: "blur(15px)", boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)", border: "1px solid rgba(255, 255, 255, 0.18)", borderRadius: "15px", color: "#f1f1f1" } };

function Chat() {
  const [input, setInput] = useState("");
  const [roomMembers, setRoomMembers] = useState([]);
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
  const audioRef = useRef(null);
  const [isMusicModalOpen, setIsMusicModalOpen] = useState(false);
  const [currentSong, setCurrentSong] = useState({ url: null, title: null, isPlaying: false });

  const [stream, setStream] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState(""); 
  const [callerName, setCallerName] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    if (!user || !user.uid) return;

    socket.emit("register-user", user.uid);

    socket.on("hey-im-calling", (data) => {
      setReceivingCall(true);
      setCaller(data.from); 
      setCallerName(data.name);
      setCallerSignal(data.signal);
    });

    socket.on("call-accepted", (signal) => {
      setCallAccepted(true);
      if (connectionRef.current) {
        connectionRef.current.signal(signal);
      }
    });

    socket.on("call-ended", () => {
      setCallEnded(true);
      if (connectionRef.current) {
        connectionRef.current.destroy();
      }
      window.location.reload();
    });

    return () => {
      socket.off("hey-im-calling");
      socket.off("call-ended");
      socket.off("call-accepted"); 
    };
  }, [user]);

  const callUser = (idToCall) => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((mediaStream) => {
      setStream(mediaStream);
      if (myVideo.current) myVideo.current.srcObject = mediaStream;

      const peer = new Peer({ initiator: true, trickle: false, stream: mediaStream });

      peer.on("signal", (data) => {
        socket.emit("call-user", {
          userToCall: idToCall,
          signalData: data,      
          from: user.uid,       
          name: user.displayName,
        });
      });

      peer.on("stream", (remoteStream) => {
        if (userVideo.current) userVideo.current.srcObject = remoteStream;
      });

      connectionRef.current = peer;
    });
  };

  const answerCall = () => {
    setCallAccepted(true);
    setReceivingCall(false);

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((mediaStream) => {
      setStream(mediaStream);
      if (myVideo.current) myVideo.current.srcObject = mediaStream;

      const peer = new Peer({ initiator: false, trickle: false, stream: mediaStream });

      peer.on("signal", (data) => {
        socket.emit("answer-call", { signal: data, to: caller }); 
      });

      peer.on("stream", (remoteStream) => {
        if (userVideo.current) userVideo.current.srcObject = remoteStream;
      });

      peer.signal(callerSignal);

      connectionRef.current = peer;
    });
  };

  const leaveCall = () => {
    setCallEnded(true);
    if (connectionRef.current) {
      const idToNotify = caller || getOtherUserId(); 
      if (idToNotify) {
        socket.emit("end-call", { to: idToNotify });
      }
      connectionRef.current.destroy();
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    window.location.reload();
  };

  const declineCall = () => {
    setReceivingCall(false);
  };

  const getOtherUserId = () => {
    if (!user || !user.uid || !roomMembers) return null;
    return roomMembers.find(memberId => memberId !== user.uid);
  };
  
  const sendAudio = async (blob) => { if (!blob) return; const formData = new FormData(); formData.append("audio", blob, "voice-message.webm"); formData.append("name", user.displayName); formData.append("timestamp", new Date().toISOString()); formData.append("uid", user.uid); formData.append("roomId", roomId); formData.append("messageType", "audio"); try { await axiosInstance.post(`messages/new/audio`, formData, { headers: { "Content-Type": "multipart/form-data" }, }); } catch (error) { console.error("Error uploading audio:", error); alert("Failed to send voice message. Please try again."); } };
  const { status, startRecording, stopRecording } = useReactMediaRecorder({ audio: true, onStop: (blobUrl, blob) => sendAudio(blob), });
  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(scrollToBottom, [messages, searchQuery]);
  useEffect(() => { if (roomId) { axiosInstance.get(`room/${roomId}`).then((res) => { setRoomName(res.data?.data?.name); setUpdatedAt(res.data?.data?.updatedAt); setRoomAvatar(res.data?.data?.avatar);setRoomMembers(res.data?.data?.members || []) }); setShowSearch(false); setSearchQuery(""); setShowAttachmentMenu(false); setShowEmojiPicker(false); setShowMoreMenu(false); setMessageToDeleteId(null); setIsClearChatDialogOpen(false); } }, [roomId]);
  useEffect(() => { if (!roomId) return; const fetchMessages = () => { axiosInstance.get(`messages/${roomId}`).then((res) => { const fetchedMessages = Array.isArray(res.data?.message) ? res.data.message : []; setMessages(currentMessages => JSON.stringify(fetchedMessages) !== JSON.stringify(currentMessages) ? fetchedMessages : currentMessages); }).catch(err => console.error("Polling for messages failed:", err)); }; const fetchMusicState = () => { axiosInstance.get(`/room/${roomId}/music-state`).then(res => { const newState = { url: res.data.currentSongUrl, title: res.data.currentSongTitle, isPlaying: res.data.isPlaying, }; setCurrentSong(oldState => JSON.stringify(newState) !== JSON.stringify(oldState) ? newState : oldState); }).catch(err => console.error("Polling for music state failed:", err)); }; fetchMessages(); fetchMusicState(); const messageInterval = setInterval(fetchMessages, 3000); const musicPollInterval = setInterval(fetchMusicState, 3000); return () => { clearInterval(messageInterval); clearInterval(musicPollInterval); }; }, [roomId]);
  useEffect(() => { const audio = audioRef.current; if (!audio) return; if (currentSong.isPlaying && currentSong.url) { if (audio.src !== currentSong.url) { audio.src = currentSong.url; } audio.play().catch(e => console.error("Audio play failed.", e)); } else { audio.pause(); } if (!currentSong.url) { audio.src = ""; } }, [currentSong]);
  const handleMusicEvent = async (eventType, eventData = {}) => { if (!roomId) return; try { await axiosInstance.post(`/room/${roomId}/music-event`, { eventType, eventData }); } catch (error) { console.error(`Error sending music event '${eventType}':`, error); } };
  const handleSelectSong = (song) => { if (!song || !song.preview_url) { alert("Sorry, a preview is not available for this song."); return; } const artistNames = song.artists.map(a => a.name).join(', '); const songData = { url: song.preview_url, title: `${song.name} - ${artistNames}` }; setCurrentSong({ ...songData, isPlaying: true }); handleMusicEvent('play-song', songData); };
  const pauseSharedSong = () => { setCurrentSong(prev => ({ ...prev, isPlaying: false })); handleMusicEvent('pause-song'); };
  const resumeSharedSong = () => { if (currentSong.url) { setCurrentSong(prev => ({ ...prev, isPlaying: true })); handleMusicEvent('play-song', { url: currentSong.url, title: currentSong.title }); } }
  const stopSharedSong = () => { setCurrentSong({ url: null, title: null, isPlaying: false }); handleMusicEvent('stop-song'); };
  const sendMessage = async (e) => { e.preventDefault(); if (!input.trim() || status === "recording") return; setShowEmojiPicker(false); const messageToSend = input; setInput(""); await axiosInstance.post(`messages/new`, { message: messageToSend, name: user.displayName, timestamp: new Date().toISOString(), uid: user.uid, roomId: roomId, }); };
  const handleFileSelection = () => { setShowAttachmentMenu(false); fileInputRef.current.click(); };
  const handleFileUpload = async (e) => { const file = e.target.files[0]; if (!file) return; let messageType = "document"; if (file.type.startsWith("image/")) messageType = "image"; else if (file.type.startsWith("video/")) messageType = "video"; const formData = new FormData(); formData.append("file", file, file.name); formData.append("name", user.displayName); formData.append("timestamp", new Date().toISOString()); formData.append("uid", user.uid); formData.append("roomId", roomId); formData.append("messageType", messageType); try { await axiosInstance.post(`messages/new/file`, formData, { headers: { "Content-Type": "multipart/form-data" }, }); } catch (error) { console.error("Error uploading file:", error); alert("Error uploading file."); } e.target.value = null; };
  const sendLocation = () => { setShowAttachmentMenu(false); if (!navigator.geolocation) return alert("Geolocation is not supported."); navigator.geolocation.getCurrentPosition(async (position) => { const { latitude, longitude } = position.coords; try { await axiosInstance.post(`messages/new`, { name: user.displayName, timestamp: new Date().toISOString(), uid: user.uid, roomId: roomId, messageType: "location", location: { lat: latitude, lon: longitude }, }); } catch (error) { console.error("Error sending location:", error); alert("Failed to send your location."); } }, () => alert("Unable to retrieve your location.")); };
  const handleOpenClearDialog = () => { setShowMoreMenu(false); setIsClearChatDialogOpen(true); };
  const handleCloseClearDialog = () => { setIsClearChatDialogOpen(false); };
  const handleConfirmClearChat = async () => { try { await axiosInstance.delete(`messages/clear/${roomId}`); setMessages([]); } catch (error) { console.error("Error clearing chat:", error); alert("Failed to clear the chat."); } finally { handleCloseClearDialog(); } };
  const handleDeleteMessage = async (msgId) => { try { await axiosInstance.delete(`messages/delete/${msgId}`); setMessages((prev) => prev.filter((message) => message._id !== msgId)); setMessageToDeleteId(null); } catch (error) { console.error("Error deleting message:", error); alert("Failed to delete the message."); } };
  const formatTimestamp = (isoDate) => !isoDate ? "" : new Date(isoDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true, });
  const formatDate = (isoDate) => { if (!isoDate) return ""; const d = new Date(isoDate); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };
  const filteredMessages = messages.filter((msg) => (!searchQuery ? true : (msg.message?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || (msg.fileName?.toLowerCase() || "").includes(searchQuery.toLowerCase())));
  const renderMessageContent = (message) => { switch (message.messageType) { case "audio": return <audio src={message.audioUrl} controls className="chat__audioPlayer" />; case "image": return (<div className="chat__mediaContainer"><img src={message.fileUrl} alt={message.fileName || "Sent image"} className="chat__mediaImage" />{message.message && <p className="chat__mediaCaption">{message.message}</p>}</div>); case "video": return (<div className="chat__mediaContainer"><video src={message.fileUrl} controls className="chat__mediaVideo" />{message.message && <p className="chat__mediaCaption">{message.message}</p>}</div>); case "document": return (<a href={message.fileUrl} target="_blank" rel="noopener noreferrer" className="chat__documentLink"><div className="chat__documentIcon"><Description /></div><div className="chat__documentInfo"><span>{message.fileName}</span><small>Document</small></div></a>); case "location": return message.location ? (<a href={`https://www.google.com/maps?q=${message.location.lat},${message.location.lon}`} target="_blank" rel="noopener noreferrer" className="chat__locationLink"><div className="chat__locationIcon"><LocationOn /></div><div className="chat__locationInfo"><span>Shared Location</span><small>View on Google Maps</small></div></a>) : (<div className="chat__text">Invalid location data</div>); default: return <div className="chat__text">{message.message}</div>; } };

  if (!roomId) return ( <div className="chat chat__welcome"><img src={WelcomeLogo} alt="Welcome to Pookie Gram" /><h1>POOKIE-GRAM</h1><p>Select a chat to start messaging with your favorite pookies.</p></div> );

  return (
    <div className="chat">
      {callAccepted && !callEnded && (
        <div className="chat__videoContainer">
          <video playsInline ref={userVideo} autoPlay className="chat__userVideo" />
          
          {stream && <video playsInline muted ref={myVideo} autoPlay className="chat__myVideo" />}

          <div className="chat__callControls">
            <IconButton onClick={leaveCall} className="chat__hangUpButton">
              <CallEnd />
            </IconButton>
          </div>
        </div>
      )}

      {receivingCall && !callAccepted && (
        <div className="chat__incomingCall">
          <Avatar />
          <div className="chat__incomingCallInfo">
            <p><strong>{callerName || "Someone"}</strong> is calling...</p>
          </div>
          <div className="chat__incomingCallActions">
            <IconButton onClick={declineCall} className="chat__declineButton">
              <PhoneDisabled />
            </IconButton>
            <IconButton onClick={answerCall} className="chat__answerButton">
              <Phone />
            </IconButton>
          </div>
        </div>
      )}

      {(!callAccepted || callEnded) && (
        <>
          <audio ref={audioRef} style={{ display: "none" }} onEnded={stopSharedSong} />
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
                <p>{updatedAt ? `Last active on ${formatDate(updatedAt)}` : "..."}</p>
              </div>
            )}
            <div className="chat__headerRight">
              <IconButton onClick={() => {
                const otherUserId = getOtherUserId();
                if (otherUserId) {
                  callUser(otherUserId);
                } else {
                  alert("Cannot start a call. This feature requires at least two members in the room.");
                }
              }}>
                <Videocam />
              </IconButton>
              {!showSearch && <IconButton onClick={() => setShowSearch(true)}><SearchOutlined /></IconButton>}
              <IconButton onClick={() => setIsMusicModalOpen(true)}><MusicNote /></IconButton>
              <div className="chat__attachment"><IconButton onClick={() => setShowAttachmentMenu((p) => !p)}><AttachFile /></IconButton><AnimatePresence>{showAttachmentMenu && (<motion.div className="chat__menu" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}><div onClick={handleFileSelection}><Photo />Photos & Videos</div><div onClick={handleFileSelection}><Description />Document</div><div onClick={sendLocation}><LocationOn />Location</div></motion.div>)}</AnimatePresence></div>
              <div className="chat__more"><IconButton onClick={() => setShowMoreMenu((p) => !p)}><MoreVert /></IconButton><AnimatePresence>{showMoreMenu && (<motion.div className="chat__menu" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}><div onClick={handleOpenClearDialog}><DeleteForever />Clear all chat</div></motion.div>)}</AnimatePresence></div>
            </div>
          </div>
          <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileUpload} accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />
          <div className="chat__body" onClick={() => { setShowAttachmentMenu(false); setShowEmojiPicker(false); setShowMoreMenu(false); setMessageToDeleteId(null); }}>
              <AnimatePresence>
                {filteredMessages.map((message) => (
                  <motion.div layout key={message._id} className={`chat__message ${message.uid === user.uid && "chat__receiver"}`} initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3, ease: "easeOut" }} onDoubleClick={() => message.uid === user.uid && setMessageToDeleteId(message._id)}>
                    <AnimatePresence>{messageToDeleteId === message._id && (<motion.div className="chat__messageDelete" onClick={() => handleDeleteMessage(message._id)} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}><DeleteForever /></motion.div>)}</AnimatePresence>
                    {message.uid !== user.uid && <span className="chat__name">{message.name}</span>}
                    <div className="chat__messageContent">{renderMessageContent(message)}<span className="chat__timestamp">{formatTimestamp(message.timestamp)}</span></div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
          </div>
          <AnimatePresence>{currentSong.url && (<motion.div className="chat__musicPlayer" initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}><div className="chat__musicPlayer_info"><MusicNote fontSize="small" /><span title={currentSong.title}>{currentSong.title}</span></div><div className="chat__musicPlayer_controls">{currentSong.isPlaying ? (<IconButton onClick={pauseSharedSong} title="Pause"><Pause /></IconButton>) : (<IconButton onClick={resumeSharedSong} title="Play"><PlayArrow /></IconButton>)}<IconButton onClick={stopSharedSong} title="Stop"><Stop /></IconButton></div></motion.div>)}</AnimatePresence>
          <div className="chat__footer">
            <div className="chat__emoji"><IconButton onClick={() => setShowEmojiPicker((p) => !p)}><InsertEmoticon /></IconButton>{showEmojiPicker && (<div className="chat__emojiPickerContainer"><Picker onEmojiClick={(e) => setInput((prev) => prev + e.emoji)} theme="dark" /></div>)}</div>
            <form onSubmit={sendMessage}><input type="text" placeholder={status === "recording" ? "Recording voice message..." : "Type a message"} value={input} onChange={(e) => setInput(e.target.value)} onFocus={() => { setShowEmojiPicker(false); setShowAttachmentMenu(false); setShowMoreMenu(false); setMessageToDeleteId(null); }} disabled={status === "recording"} /></form>
            {input ? (<IconButton type="submit" onClick={sendMessage} className="chat__sendButton"><Send /></IconButton>) : (<IconButton onClick={status === "recording" ? stopRecording : startRecording}>{status === "recording" ? <StopCircle className="chat__mic_recording" /> : <Mic />}</IconButton>)}
          </div>
        </>
      )}

      <MusicSearchModal open={isMusicModalOpen} onClose={() => setIsMusicModalOpen(false)} onSongSelect={handleSelectSong} />
      <Dialog open={isClearChatDialogOpen} onClose={handleCloseClearDialog} sx={dialogSx}>
        <DialogTitle>{"Clear all messages in this chat?"}</DialogTitle>
        <DialogContent><DialogContentText sx={{ color: "#c0c0c0" }}>Are you sure you want to permanently delete all messages in "{roomName}"? This action cannot be undone.</DialogContentText></DialogContent>
        <DialogActions sx={{ justifyContent: 'center', p: '16px 24px' }}><Button onClick={handleCloseClearDialog} sx={{ color: '#f1f1f1' }}>Cancel</Button><Button onClick={handleConfirmClearChat} variant="contained" autoFocus sx={{ backgroundColor: '#ff4d6d', '&:hover': { backgroundColor: '#ff3355' } }}>Clear Chat</Button></DialogActions>
      </Dialog>
    </div>
  );
}

export default Chat;