const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

// --- Schema Imports ---
const Rooms = require('./DbRooms'); 
const Message = require('./dbmsg');

// =======================================================
//                  Configuration
// =======================================================

const JAMENDO_CLIENT_ID = '445f547b'; 
const app = express();
const PORT = process.env.PORT || 5000;

// --- Middlewares ---
app.use(cors());
app.use(bodyParser.json());

// --- Database Connection ---
const dbUrl = "mongodb+srv://santhoshrajan817:Santhosh007@whatsapp.vb52t.mongodb.net/whatsapp";
mongoose.connect(dbUrl)
    .then(() => console.log("MongoDB connected successfully."))
    .catch(err => console.error("MongoDB connection error:", err));

// =======================================================
//                  API Routes
// =======================================================

// --- Base Route ---
app.get("/", (req, res) => res.status(200).send("PookieGram API is running!"));

// --- Room & Message Routes ---
app.post("/group/create", (req, res) => {
    const { name, avatar } = req.body;
    if (!name) return res.status(400).json({ message: "Room name is required" });
    const room = new Rooms({ name, avatar });
    room.save()
        .then(result => res.status(201).json({ data: result }))
        .catch(err => res.status(500).json({ message: "Error creating room", error: err }));
});
app.get("/all/rooms", (req, res) => {
    Rooms.find().sort({ updatedAt: -1 })
        .then(rooms => res.status(200).json({ data: rooms }))
        .catch(err => res.status(500).send("Internal Server Error fetching rooms."));
});
app.get("/room/:id", (req, res) => {
    Rooms.findOne({ _id: req.params.id })
        .then(room => {
            if (!room) return res.status(404).json({ message: "Room not found" });
            res.status(200).json({ data: room });
        })
        .catch(err => res.status(500).send("Internal Server Error fetching room details."));
});
app.get("/messages/:id", (req, res) => {
    Message.find({ roomId: req.params.id })
        .then(result => res.status(200).json({ message: result }))
        .catch(err => res.status(500).send("Error fetching messages"));
});
app.post("/messages/new", (req, res) => {
    const dbMessage = new Message(req.body);
    dbMessage.save()
        .then(result => {
            Rooms.findByIdAndUpdate(req.body.roomId, { updatedAt: new Date() }).exec();
            res.status(201).json({ data: result });
        })
        .catch(err => res.status(500).send("Error saving message"));
});
app.post("/room/:roomId/music-event", async (req, res) => {
    const { roomId } = req.params;
    const { eventType, eventData } = req.body;
    let updateData = { updatedAt: new Date() };
    if (eventType === 'play-song') {
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


// --- Jamendo Music API Routes ---
const transformJamendoTrack = (jamendoTrack) => {
    if (!jamendoTrack || !jamendoTrack.audio) return null; // Ensure track is valid and has audio
    return {
        id: jamendoTrack.id,
        name: jamendoTrack.name,
        preview_url: jamendoTrack.audio,
        artists: [{ name: jamendoTrack.artist_name }],
        album: {
            images: [{ url: jamendoTrack.image }]
        }
    };
};

app.get("/api/jamendo/recommendations", async (req, res) => {
    try {
        const response = await axios.get('https://api.jamendo.com/v3.0/tracks/', {
            params: {
                client_id: JAMENDO_CLIENT_ID,
                format: 'json',
                limit: 30,
                order: 'popularity_week'
            }
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
            params: {
                client_id: JAMENDO_CLIENT_ID,
                format: 'json',
                limit: 20,
                search: q
            }
        });
        const tracks = response.data.results || [];
        const formattedTracks = tracks.map(transformJamendoTrack).filter(t => t !== null);
        res.status(200).json(formattedTracks);
    } catch (error) {
        console.error("Error in /api/jamendo/search:", error.message);
        res.status(500).json({ message: "Failed to fetch music from Jamendo." });
    }
});

// =======================================================
//                  Start Server
// =======================================================
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});