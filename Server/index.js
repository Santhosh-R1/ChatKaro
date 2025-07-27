const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const axios = require('axios');
const http = require('http'); // Import http
const { Server } = require("socket.io"); // Import Server from socket.io

// Import Mongoose Models
const Rooms = require('./DbRooms'); 
const Message = require('./dbmsg');

const app = express();
// Create an HTTP server from the Express app to attach Socket.IO
const server = http.createServer(app); 

// --- Socket.IO Setup ---
const io = new Server(server, {
    cors: {
        origin: "*", // IMPORTANT: In production, restrict this to your frontend's URL (e.g., "http://localhost:3000")
        methods: ["GET", "POST"]
    }
});

// --- Middlewares ---
app.use(cors());
app.use(bodyParser.json());

// --- Cloudinary Configuration ---
cloudinary.config({
  cloud_name: 'dpwx76ub2',
  api_key: '651975388482573',
  api_secret: '-KRk9RFBKRNWPpMMdDogCkGN3i8',
  secure: true
});

// --- Multer Configuration ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Database Connection ---
const dbUrl = "mongodb+srv://santhoshrajan817:Santhosh007@whatsapp.vb52t.mongodb.net/whatsapp";
mongoose.connect(dbUrl);
const db = mongoose.connection;
db.once("open", () => {
    console.log("DB connected");
});


// ================== REST API ROUTES (No changes to your existing routes) ================== //

app.get("/", (req, res) => {
    res.send("Hello from the PookieGram API Server!");
});

app.post("/group/create", (req, res) => {
    const { name, avatar } = req.body;
    if (!name) return res.status(400).json({ message: "Room name is required" });
    let room = new Rooms({ name, avatar });
    room.save()
        .then((result) => res.status(201).json({ data: result }))
        .catch((err) => res.status(500).json({ message: "Error creating room", error: err }));
});

app.get("/all/rooms", (req, res) => {
    Rooms.find().sort({ updatedAt: -1 }) 
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

app.get("/messages/:id", (req, res) => {
    Message.find({ roomId: req.params.id }).sort({ createdAt: 1 })
        .then((result) => res.status(200).json({ message: result }))
        .catch((err) => res.status(500).send("Error fetching messages"));
});

app.post("/messages/new", (req, res) => {
    const dbMessage = new Message(req.body);
    dbMessage.save()
        .then(async (result) => {
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

const handleFileUpload = (req, res, resourceType, messageDataField) => {
    if (!req.file) return res.status(400).send(`No ${messageDataField} file uploaded.`);
    
    const readableStream = new Readable();
    readableStream.push(req.file.buffer);
    readableStream.push(null);

    const uploadOptions = { resource_type: resourceType };
    if (resourceType !== 'video') { 
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

app.post("/room/:roomId/music-event", async (req, res) => {
  const { roomId } = req.params;
  const { eventType, eventData } = req.body;
  let updateData = {};

  if (eventType === 'play-song') {
    if (!eventData || !eventData.url || !eventData.title) {
      return res.status(400).send("Song data (url, title) is required for 'play-song' event.");
    }
    updateData = { currentSongUrl: eventData.url, currentSongTitle: eventData.title, isPlaying: true };
  } else if (eventType === 'pause-song') {
    updateData = { isPlaying: false };
  } else if (eventType === 'stop-song') {
    updateData = { currentSongUrl: null, currentSongTitle: null, isPlaying: false };
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

const JAMENDO_CLIENT_ID = '445f547b'; 

const transformJamendoTrack = (jamendoTrack) => {
  if (!jamendoTrack || !jamendoTrack.audio) return null;
  return { id: jamendoTrack.id, name: jamendoTrack.name, preview_url: jamendoTrack.audio, artists: [{ name: jamendoTrack.artist_name }], album: { images: [{ url: jamendoTrack.image }] }, };
};

app.get("/api/jamendo/recommendations", async (req, res) => {
  try {
    const response = await axios.get('https://api.jamendo.com/v3.0/tracks/', { params: { client_id: JAMENDO_CLIENT_ID, format: 'json', limit: 30, order: 'popularity_week' }, });
    const formattedTracks = (response.data.results || []).map(transformJamendoTrack).filter(t => t !== null);
    res.status(200).json(formattedTracks);
  } catch (error) { res.status(500).json({ message: "Failed to fetch music from Jamendo." }); }
});

app.get("/api/jamendo/search", async (req, res) => {
  const { q } = req.query;
  if (!q) { return res.status(400).json({ message: "Search query 'q' is required." }); }
  try {
    const response = await axios.get('https://api.jamendo.com/v3.0/tracks/', { params: { client_id: JAMENDO_CLIENT_ID, format: 'json', limit: 40, search: q }, });
    const formattedTracks = (response.data.results || []).map(transformJamendoTrack).filter(t => t !== null);
    res.status(200).json(formattedTracks);
  } catch (error) { res.status(500).json({ message: "Failed to fetch music from Jamendo." }); }
});


app.get("/api/music/search", async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: "Search query 'q' is required." });
    try {
        const saavnApiUrl = `https://saavn.dev/api/search/songs?query=${encodeURIComponent(q)}`;
        const saavnResponse = await axios.get(saavnApiUrl);
        res.status(200).json(saavnResponse.data.data.results || []);
    } catch (error) { res.status(500).json({ message: "An internal error occurred while searching for music." }); }
});

// ================== REAL-TIME VIDEO CALL SIGNALING (NEW) ================== //

const userSocketMap = {}; // Maps userId to a unique socketId

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // When a user logs in, they should emit this event with their unique user ID
    socket.on("register-user", (userId) => {
        userSocketMap[userId] = socket.id;
        console.log(`User Registered: ${userId} -> ${socket.id}`);
        // Optional: Let other users know who is online
        io.emit("online-users", Object.keys(userSocketMap));
    });

    // A user initiates a call to another user
    socket.on("call-user", ({ userToCall, signalData, from, name }) => {
        const toSocketId = userSocketMap[userToCall];
        if (toSocketId) {
            console.log(`Forwarding call from ${name} to user ${userToCall}`);
            io.to(toSocketId).emit("hey-im-calling", { signal: signalData, from, name });
        } else {
            console.log(`Call failed: User ${userToCall} is not online or not registered.`);
        }
    });

    // A user answers a call
    socket.on("answer-call", (data) => {
        console.log("Call answered, forwarding signal back to caller.");
        io.to(data.to).emit("call-accepted", data.signal);
    });

    // A user ends a call
    socket.on("end-call", ({ to }) => {
        console.log(`Forwarding end-call signal to socket ${to}`);
        io.to(to).emit("call-ended");
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
        // Clean up the user from the map
        for (const userId in userSocketMap) {
            if (userSocketMap[userId] === socket.id) {
                delete userSocketMap[userId];
                console.log(`Unregistered user: ${userId}`);
                break;
            }
        }
        io.emit("online-users", Object.keys(userSocketMap));
    });
});


// ================== SERVER START ================== //

const PORT = process.env.PORT || 5000;
// Use the 'server' instance (with socket.io) to listen, not the original 'app'
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});