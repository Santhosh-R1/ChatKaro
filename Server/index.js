const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const JAMENDO_CLIENT_ID = '445f547b'; 
const app = express();
const PORT = process.env.PORT || 5000;
const UPLOADS_DIR = 'uploads';

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

const RoomSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  avatar: { type: String },
  updatedAt: { type: Date, default: Date.now },
  currentSongUrl: { type: String, default: null },
  currentSongTitle: { type: String, default: null },
  isPlaying: { type: Boolean, default: false },
}, { timestamps: true });

const MessageSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
  uid: { type: String, required: true },
  name: { type: String, required: true },
  message: { type: String },
  timestamp: { type: String, required: true },
  messageType: { type: String, default: 'text' }, 
  fileUrl: { type: String },
  fileName: { type: String },
  audioUrl: { type: String },
  location: {
    lat: { type: Number },
    lon: { type: Number },
  },
}, { timestamps: true });

const Rooms = mongoose.model('Room', RoomSchema);
const Message = mongoose.model('Message', MessageSchema);


app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, UPLOADS_DIR)));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`);
  },
});
const upload = multer({ storage: storage });

const dbUrl = "mongodb+srv://santhoshrajan817:Santhosh007@whatsapp.vb52t.mongodb.net/whatsapp";
mongoose.connect(dbUrl)
  .then(() => console.log("MongoDB connected successfully."))
  .catch(err => console.error("MongoDB connection error:", err));

app.get("/", (req, res) => res.status(200).send("PookieGram API is running!"));

app.post("/group/create", (req, res) => {
  const { name, avatar } = req.body;
  if (!name) return res.status(400).json({ message: "Room name is required" });
  Rooms.create({ name, avatar, updatedAt: new Date() })
    .then(result => res.status(201).json({ data: result }))
    .catch(err => res.status(500).json({ message: "Error creating room", error: err }));
});

app.get("/all/rooms", (req, res) => {
  Rooms.find().sort({ updatedAt: -1 })
    .then(rooms => res.status(200).json({ data: rooms }))
    .catch(err => res.status(500).send("Internal Server Error fetching rooms."));
});

app.get("/room/:id", (req, res) => {
  Rooms.findById(req.params.id)
    .then(room => {
      if (!room) return res.status(404).json({ message: "Room not found" });
      res.status(200).json({ data: room });
    })
    .catch(err => res.status(500).send("Internal Server Error fetching room details."));
});

app.get("/messages/:id", (req, res) => {
  Message.find({ roomId: req.params.id }).sort({ createdAt: 1 })
    .then(result => res.status(200).json({ message: result }))
    .catch(err => res.status(500).send("Error fetching messages"));
});

app.post("/messages/new", (req, res) => {
  const newMessage = new Message(req.body);
  newMessage.save()
    .then(result => {
      Rooms.findByIdAndUpdate(req.body.roomId, { updatedAt: new Date() }).exec();
      res.status(201).json({ data: result });
    })
    .catch(err => res.status(500).send("Error saving message: " + err.message));
});

app.post("/messages/new/file", upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  const newMessage = new Message({
    ...req.body,
    fileUrl: fileUrl,
    fileName: req.file.originalname,
  });
  newMessage.save()
    .then(result => {
      Rooms.findByIdAndUpdate(req.body.roomId, { updatedAt: new Date() }).exec();
      res.status(201).json({ data: result });
    })
    .catch(err => res.status(500).send("Error saving file message: " + err.message));
});

app.post("/messages/new/audio", upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No audio file uploaded.');
  }
  const audioUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  const newMessage = new Message({
    ...req.body,
    audioUrl: audioUrl,
    messageType: 'audio'
  });
  newMessage.save()
    .then(result => {
      Rooms.findByIdAndUpdate(req.body.roomId, { updatedAt: new Date() }).exec();
      res.status(201).json({ data: result });
    })
    .catch(err => res.status(500).send("Error saving audio message: " + err.message));
});

app.delete("/messages/delete/:msgId", async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.msgId);
    if (!message) {
      return res.status(404).send("Message not found.");
    }
    res.status(200).send("Message deleted successfully.");
  } catch (error) {
    res.status(500).send("Error deleting message: " + error.message);
  }
});

app.delete("/messages/clear/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    await Message.deleteMany({ roomId: roomId });
    res.status(200).send("Chat cleared successfully.");
  } catch (error) {
    res.status(500).send("Error clearing chat: " + error.message);
  }
});

app.post("/room/:roomId/music-event", async (req, res) => {
  const { roomId } = req.params;
  const { eventType, eventData } = req.body;
  let updateData = { updatedAt: new Date() };

  if (eventType === 'play-song') {
    if (!eventData || !eventData.url || !eventData.title) {
      return res.status(400).send("Song data (url, title) is required for 'play-song' event.");
    }
    updateData = { ...updateData, currentSongUrl: eventData.url, currentSongTitle: eventData.title, isPlaying: true };
  } else if (eventType === 'pause-song') {
    updateData = { ...updateData, isPlaying: false };
  } else if (eventType === 'stop-song') {
    updateData = { ...updateData, currentSongUrl: null, currentSongTitle: null, isPlaying: false };
  } else {
    return res.status(400).send("Invalid event type.");
  }
  try {
    await Rooms.findByIdAndUpdate(roomId, { $set: updateData });
    res.status(200).send("Music state updated.");
  } catch (error) {
    res.status(500).send("Error updating music state.");
  }
});

app.get("/room/:roomId/music-state", (req, res) => {
  Rooms.findById(req.params.roomId)
    .select('currentSongUrl currentSongTitle isPlaying')
    .then(room => {
      if (!room) return res.status(404).send("Room not found.");
      res.status(200).json(room);
    })
    .catch(err => res.status(500).send("Error fetching music state."));
});

const transformJamendoTrack = (jamendoTrack) => {
  if (!jamendoTrack || !jamendoTrack.audio) return null;
  return {
    id: jamendoTrack.id,
    name: jamendoTrack.name,
    preview_url: jamendoTrack.audio,
    artists: [{ name: jamendoTrack.artist_name }],
    album: { images: [{ url: jamendoTrack.image }] },
  };
};

app.get("/api/jamendo/recommendations", async (req, res) => {
  try {
    const response = await axios.get('https://api.jamendo.com/v3.0/tracks/', {
      params: { client_id: JAMENDO_CLIENT_ID, format: 'json', limit: 30, order: 'popularity_week' },
    });
    const tracks = response.data.results || [];
    const formattedTracks = tracks.map(transformJamendoTrack).filter(t => t !== null);
    res.status(200).json(formattedTracks);
  } catch (error) {
    console.error("Error in /api/jamendo/recommendations:", error.message);
    res.status(500).json({ message: "Failed to fetch music from Jamendo." });
  }
});

app.get("/api/jamendo/search", async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ message: "Search query 'q' is required." });
  }
  try {
    const response = await axios.get('https://api.jamendo.com/v3.0/tracks/', {
      params: { client_id: JAMENDO_CLIENT_ID, format: 'json', limit: 20, search: q },
    });
    const tracks = response.data.results || [];
    const formattedTracks = tracks.map(transformJamendoTrack).filter(t => t !== null);
    res.status(200).json(formattedTracks);
  } catch (error) {
    console.error("Error in /api/jamendo/search:", error.message);
    res.status(500).json({ message: "Failed to fetch music from Jamendo." });
  }
});
app.delete("/room/delete/:id", async (req, res) => {
  const roomId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(roomId)) {
    return res.status(400).send("Invalid Room ID format.");
  }

  try {
    const deletedRoom = await Rooms.findByIdAndDelete(roomId);

    if (!deletedRoom) {
      return res.status(404).send("Room not found.");
    }

    await Message.deleteMany({ roomId: roomId });

    res.status(200).send("Room and associated messages deleted successfully.");
  } catch (error) {
    console.error("Error deleting room:", error);
    res.status(500).send("Error deleting room: " + error.message);
  }
});
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});