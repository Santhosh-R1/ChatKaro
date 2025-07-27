const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const axios = require('axios');

// Import Mongoose Models (assuming they are in these files)
// Make sure your DbRooms.js file has the updated RoomSchema with music fields.
const Rooms = require('./DbRooms'); 
const Message = require('./dbmsg');

// Initialize Express app
const app = express();

// --- Middlewares ---
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(bodyParser.json()); // Parse JSON bodies

// --- Cloudinary Configuration (for file/audio uploads) ---
cloudinary.config({
  cloud_name: 'dpwx76ub2',
  api_key: '651975388482573',
  api_secret: '-KRk9RFBKRNWPpMMdDogCkGN3i8',
  secure: true
});

// --- Multer Configuration (for handling multipart/form-data) ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Database Connection ---
const dbUrl = "mongodb+srv://santhoshrajan817:Santhosh007@whatsapp.vb52t.mongodb.net/whatsapp";
mongoose.connect(dbUrl);
const db = mongoose.connection;

db.once("open", () => {
    console.log("DB connected");
    // You can set up your change streams here if needed
});


// ================== API ROUTES ================== //

app.get("/", (req, res) => {
    res.send("Hello from the PookieGram API Server!");
});

// --- Room Routes ---
app.post("/group/create", (req, res) => {
    const { name, avatar } = req.body;
    if (!name) return res.status(400).json({ message: "Room name is required" });
    let room = new Rooms({ name, avatar });
    room.save()
        .then((result) => res.status(201).json({ data: result }))
        .catch((err) => res.status(500).json({ message: "Error creating room", error: err }));
});

app.get("/all/rooms", (req, res) => {
    Rooms.find().sort({ updatedAt: -1 }) // Sort by most recently active
        .then((rooms) => res.status(200).json({ data: rooms }))
        .catch((err) => res.status(500).send("Internal Server Error"));
});

app.get("/room/:id", (req, res) => {
    Rooms.findById(req.params.id)
        .then((room) => {
            if (!room) return res.status(404).json({ message: "Room not found" });
            res.status(200).json({ data: room });
        })
        .catch((err) => res.status(500).send("Internal Server Error"));
});

app.delete("/room/delete/:roomId", async (req, res) => {
    const { roomId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(roomId)) return res.status(400).send("Invalid Room ID format.");
    try {
        const deletedRoom = await Rooms.findByIdAndDelete(roomId);
        if (!deletedRoom) return res.status(404).send({ message: "Room not found." });
        await Message.deleteMany({ roomId: roomId });
        res.status(200).send({ message: `Room '${deletedRoom.name}' and all its messages have been deleted.` });
    } catch (err) {
        console.error("Error deleting room:", err);
        res.status(500).send("Error deleting room.");
    }
});

// --- Message Routes ---
app.get("/messages/:id", (req, res) => {
    Message.find({ roomId: req.params.id }).sort({ createdAt: 1 })
        .then((result) => res.status(200).json({ message: result }))
        .catch((err) => res.status(500).send("Error fetching messages"));
});

app.post("/messages/new", (req, res) => {
    const dbMessage = new Message(req.body);
    dbMessage.save()
        .then(async (result) => {
            // Update the room's updatedAt timestamp to bring it to the top of the list
            await Rooms.findByIdAndUpdate(req.body.roomId, { updatedAt: new Date() });
            res.status(201).json({ data: result });
        })
        .catch((err) => res.status(500).send("Error saving message"));
});

app.delete("/messages/clear/:roomId", (req, res) => {
    Message.deleteMany({ roomId: req.params.roomId })
        .then(result => res.status(200).send({ message: `Successfully cleared ${result.deletedCount} messages.` }))
        .catch(err => res.status(500).send("Error clearing chat."));
});

app.delete("/messages/delete/:messageId", (req, res) => {
    Message.findByIdAndDelete(req.params.messageId)
        .then(result => {
            if (!result) return res.status(404).send({ message: "Message not found." });
            res.status(200).send({ message: `Message ${req.params.messageId} deleted successfully.` });
        })
        .catch(err => res.status(500).send("Error deleting message."));
});

// --- File Upload Routes ---
const handleFileUpload = (req, res, resourceType, messageDataField) => {
    if (!req.file) return res.status(400).send(`No ${messageDataField} file uploaded.`);
    
    const readableStream = new Readable();
    readableStream.push(req.file.buffer);
    readableStream.push(null);

    const uploadOptions = { resource_type: resourceType };
    if (resourceType !== 'video') { // For images/docs, use original filename as public_id
        uploadOptions.public_id = req.file.originalname;
    }

    const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, async (error, result) => {
        if (error) {
            console.error("Cloudinary upload error:", error);
            return res.status(500).send("Cloudinary Error");
        }
        
        const messageBody = {
            ...req.body,
            [messageDataField]: result.secure_url
        };
        
        if (messageDataField === 'fileUrl') {
            messageBody.fileName = req.file.originalname;
        }

        const dbMessage = new Message(messageBody);
        try {
            const savedMessage = await dbMessage.save();
            await Rooms.findByIdAndUpdate(req.body.roomId, { updatedAt: new Date() });
            res.status(201).json(savedMessage);
        } catch (dbError) {
            res.status(500).send("DB Error saving message");
        }
    });

    readableStream.pipe(uploadStream);
};

app.post("/messages/new/audio", upload.single('audio'), (req, res) => {
    handleFileUpload(req, res, 'video', 'audioUrl');
});

app.post("/messages/new/file", upload.single('file'), (req, res) => {
    handleFileUpload(req, res, 'auto', 'fileUrl');
});

// --- POLLING-BASED MUSIC FEATURE ROUTES ---
app.post("/room/:roomId/music-event", async (req, res) => {
  const { roomId } = req.params;
  const { eventType, eventData } = req.body;
  let updateData = {};

  if (eventType === 'play-song') {
    if (!eventData || !eventData.url || !eventData.title) {
      return res.status(400).send("Song data (url, title) is required for 'play-song' event.");
    }
    // Note: `updatedAt` is handled automatically by `timestamps: true` on update
    updateData = { currentSongUrl: eventData.url, currentSongTitle: eventData.title, isPlaying: true };
  } else if (eventType === 'pause-song') {
    updateData = { isPlaying: false };
  } else if (eventType === 'stop-song') {
    updateData = { currentSongUrl: null, currentSongTitle: null, isPlaying: false };
  } else {
    return res.status(400).send("Invalid event type.");
  }
  
  try {
    // findByIdAndUpdate will trigger the `updatedAt` timestamp update
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

// ================== MUSIC SEARCH APIs ================== //

// --- OPTION 1: JAMENDO API (No Key Needed) ---
const JAMENDO_CLIENT_ID = '445f547b'; 

const transformJamendoTrack = (jamendoTrack) => {
  if (!jamendoTrack || !jamendoTrack.audio) return null;
  return {
    id: jamendoTrack.id,
    name: jamendoTrack.name,
    preview_url: jamendoTrack.audio, // Using preview_url to match Spotify/Saavn field names
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
      params: { client_id: JAMENDO_CLIENT_ID, format: 'json', limit: 40, search: q },
    });
    const tracks = response.data.results || [];
    const formattedTracks = tracks.map(transformJamendoTrack).filter(t => t !== null);
    res.status(200).json(formattedTracks);
  } catch (error) {
    console.error("Error in /api/jamendo/search:", error.message);
    res.status(500).json({ message: "Failed to fetch music from Jamendo." });
  }
});


// --- OPTION 2: SAAVN.DEV API (No Key Needed) ---
app.get("/api/music/search", async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: "Search query 'q' is required." });
    try {
        const saavnApiUrl = `https://saavn.dev/api/search/songs?query=${encodeURIComponent(q)}`;
        const saavnResponse = await axios.get(saavnApiUrl);
        const results = saavnResponse.data.data.results || [];
        res.status(200).json(results);
    } catch (error) {
        console.error("Error during saavn.dev API call:", error.message);
        if (error.response) return res.status(error.response.status).json({ message: "Failed to fetch songs from saavn.dev.", providerError: error.response.data });
        res.status(500).json({ message: "An internal error occurred while searching for music." });
    }
});


// ================== SERVER START ================== //

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});