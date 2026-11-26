// server.js
try {
    if (typeof process.loadEnvFile === 'function') {
        process.loadEnvFile();
    }
} catch (e) {
    // .env file optional or not found
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const axios = require('axios');
const http = require('http');
const { Server } = require("socket.io");

const Rooms = require('./DbRooms');
const Message = require('./dbmsg');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const allowedOrigins = [
    "https://pookie-chat-webapp.vercel.app",
    "http://localhost:5173"
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Health-check route (kept before DB middleware so you can verify Express routing immediately)
app.get("/", (req, res) => {
    res.send("Hello from the PookieGram API Server!");
});

// Serverless-safe cached MongoDB connection
const dbUrl = process.env.MONGODB_URL;
let cachedPromise = null;

async function connectDB() {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }
    if (!dbUrl) {
        throw new Error("MONGODB_URL is not defined in environment variables.");
    }
    if (!cachedPromise) {
        cachedPromise = mongoose.connect(dbUrl)
            .then((conn) => {
                console.log("DB connected");
                return conn;
            })
            .catch((err) => {
                cachedPromise = null;
                throw err;
            });
    }
    return cachedPromise;
}

// Ensure DB is connected before handling API routes
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        console.error("MongoDB connection error:", err.message);
        res.status(500).json({ message: "Database connection error", error: err.message });
    }
});

app.post("/group/create", (req, res) => {
    const { name, avatar, creatorId } = req.body;

    if (!name) return res.status(400).json({ message: "Room name is required" });
    if (!creatorId) return res.status(400).json({ message: "Creator ID is required" });

    let room = new Rooms({ name, avatar, members: [creatorId] });

    room.save()
        .then((result) => res.status(201).json({ data: result }))
        .catch((err) => {
            console.error("Error creating room:", err);
            res.status(500).json({ message: "Error creating room", error: err.message });
        });
});

app.get("/all/rooms", (req, res) => {
    Rooms.find().sort({ updatedAt: -1 })
        .then((rooms) => res.status(200).json({ data: rooms }))
        .catch((err) => {
            console.error("Error fetching rooms:", err);
            res.status(500).send("Internal Server Error");
        });
});

app.get("/room/:id", (req, res) => {
    Rooms.findById(req.params.id)
        .then((room) => {
            if (!room) return res.status(404).json({ message: "Room not found" });
            res.status(200).json({ data: room });
        })
        .catch((err) => res.status(500).send("Internal Server Error"));
});

// Helper to parse Cloudinary URL for publicId and resourceType
const extractCloudinaryInfo = (url) => {
    if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return null;
    try {
        const parts = url.split('/upload/');
        if (parts.length < 2) return null;

        let resourceType = 'image';
        if (parts[0].includes('/video')) resourceType = 'video';
        else if (parts[0].includes('/raw')) resourceType = 'raw';

        let pathAfterUpload = parts[1];
        // Strip version if present (e.g. v123456789/)
        pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');

        let publicId = pathAfterUpload;
        if (resourceType !== 'raw') {
            publicId = pathAfterUpload.replace(/\.[^/.]+$/, '');
        }

        return { publicId: decodeURIComponent(publicId), resourceType };
    } catch (e) {
        return null;
    }
};

// Helper to destroy an asset in Cloudinary safely
const deleteCloudinaryAsset = async (publicId, resourceType = 'image') => {
    if (!publicId) return;
    try {
        const res = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        if (res && res.result === 'not found' && resourceType === 'image') {
            await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
            await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
        }
    } catch (err) {
        console.error(`Error deleting Cloudinary asset (${publicId}):`, err.message || err);
    }
};

// Helper to delete all attached files for a list of messages
const deleteMessageFilesFromCloudinary = async (messages) => {
    if (!Array.isArray(messages)) messages = [messages];
    const deletePromises = [];

    for (const msg of messages) {
        if (!msg) continue;
        let publicId = msg.cloudinaryPublicId;
        let resourceType = msg.resourceType;

        if (!publicId) {
            const urlInfo = extractCloudinaryInfo(msg.fileUrl || msg.audioUrl);
            if (urlInfo) {
                publicId = urlInfo.publicId;
                resourceType = urlInfo.resourceType;
            }
        }

        if (publicId) {
            deletePromises.push(deleteCloudinaryAsset(publicId, resourceType || 'image'));
        }
    }

    await Promise.allSettled(deletePromises);
};

app.delete("/room/delete/:roomId", async (req, res) => {
    const { roomId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(roomId)) return res.status(400).send("Invalid Room ID format.");
    try {
        const room = await Rooms.findById(roomId);
        if (!room) return res.status(404).send({ message: "Room not found." });

        // 1. Find all messages in this room and delete their uploaded files from Cloudinary
        const messages = await Message.find({ roomId: roomId });
        await deleteMessageFilesFromCloudinary(messages);

        // 2. If room avatar is stored on Cloudinary, delete it as well
        if (room.avatar) {
            const avatarInfo = extractCloudinaryInfo(room.avatar);
            if (avatarInfo) {
                await deleteCloudinaryAsset(avatarInfo.publicId, avatarInfo.resourceType || 'image');
            }
        }

        // 3. Delete all room messages from database
        await Message.deleteMany({ roomId: roomId });

        // 4. Delete the room from database
        await Rooms.findByIdAndDelete(roomId);

        res.status(200).send({ message: `Room '${room.name}', its messages, and all Cloudinary files have been deleted.` });
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
    const { roomId, uid } = req.body;

    dbMessage.save()
        .then(async (result) => {
            await Rooms.findByIdAndUpdate(roomId, {
                $addToSet: { members: uid }
            });
            res.status(201).json({ data: result });
        })
        .catch((err) => {
            console.error("Error saving message or updating room:", err);
            res.status(500).send("Error saving message");
        });
});

app.delete("/messages/clear/:roomId", async (req, res) => {
    try {
        const messages = await Message.find({ roomId: req.params.roomId });
        await deleteMessageFilesFromCloudinary(messages);

        const result = await Message.deleteMany({ roomId: req.params.roomId });
        res.status(200).send({ message: `Successfully cleared ${result.deletedCount} messages and deleted associated files.` });
    } catch (err) {
        console.error("Error clearing chat:", err);
        res.status(500).send("Error clearing chat.");
    }
});

app.delete("/messages/delete/:messageId", async (req, res) => {
    try {
        const message = await Message.findById(req.params.messageId);
        if (!message) return res.status(404).send({ message: "Message not found." });

        // Delete file from Cloudinary if attached
        await deleteMessageFilesFromCloudinary([message]);

        // Delete from database
        await Message.findByIdAndDelete(req.params.messageId);

        res.status(200).send({ message: `Message ${req.params.messageId} and associated Cloudinary file deleted successfully.` });
    } catch (err) {
        console.error("Error deleting message:", err);
        res.status(500).send("Error deleting message.");
    }
});

const handleFileUpload = (req, res, resourceType, messageDataField) => {
    if (!req.file) return res.status(400).send(`No ${messageDataField} file uploaded.`);

    const { roomId, uid } = req.body;

    const readableStream = new Readable();
    readableStream.push(req.file.buffer);
    readableStream.push(null);

    const uploadOptions = {
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true
    };
    if (process.env.CLOUDINARY_UPLOAD_PRESET) {
        uploadOptions.upload_preset = process.env.CLOUDINARY_UPLOAD_PRESET;
    }

    const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, async (error, result) => {
        if (error) {
            console.error("Cloudinary upload error:", error);
            return res.status(500).send("Cloudinary Error");
        }

        const messageBody = {
            ...req.body,
            [messageDataField]: result.secure_url,
            cloudinaryPublicId: result.public_id,
            resourceType: result.resource_type || resourceType
        };

        if (messageDataField === 'fileUrl') {
            messageBody.fileName = req.file.originalname;
        }

        const dbMessage = new Message(messageBody);
        try {
            const savedMessage = await dbMessage.save();
            await Rooms.findByIdAndUpdate(roomId, {
                $addToSet: { members: uid }
            });
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
        const formattedTracks = (response.data.results || []).map(transformJamendoTrack).filter(t => t !== null);
        res.status(200).json(formattedTracks);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch music from Jamendo." });
    }
});

app.get("/api/jamendo/search", async (req, res) => {
    const { q } = req.query;
    if (!q) { return res.status(400).json({ message: "Search query 'q' is required." }); }
    try {
        const response = await axios.get('https://api.jamendo.com/v3.0/tracks/', {
            params: { client_id: JAMENDO_CLIENT_ID, format: 'json', limit: 40, search: q },
        });
        const formattedTracks = (response.data.results || []).map(transformJamendoTrack).filter(t => t !== null);
        res.status(200).json(formattedTracks);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch music from Jamendo." });
    }
});

app.get("/api/music/search", async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: "Search query 'q' is required." });
    try {
        const saavnApiUrl = `https://saavn.dev/api/search/songs?query=${encodeURIComponent(q)}`;
        const saavnResponse = await axios.get(saavnApiUrl);
        res.status(200).json(saavnResponse.data.data.results || []);
    } catch (error) {
        res.status(500).json({ message: "An internal error occurred while searching for music." });
    }
});

const userSocketMap = {};

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("register-user", (userId) => {
        userSocketMap[userId] = socket.id;
        console.log(`User Registered: ${userId} -> ${socket.id}`);
        io.emit("online-users", Object.keys(userSocketMap));
    });

    socket.on("call-user", ({ userToCall, signalData, from, name }) => {
        const toSocketId = userSocketMap[userToCall];
        if (toSocketId) {
            console.log(`Forwarding call from ${name} (UID: ${from}) to user ${userToCall} (Socket: ${toSocketId})`);
            io.to(toSocketId).emit("hey-im-calling", { signal: signalData, from, name });
        } else {
            console.log(`Call failed: User ${userToCall} is not online or not registered.`);
        }
    });

    socket.on("answer-call", (data) => {
        const toSocketId = userSocketMap[data.to];
        if (toSocketId) {
            console.log(`Call answered. Forwarding signal from answering user back to original caller (Socket: ${toSocketId})`);
            io.to(toSocketId).emit("call-accepted", data.signal);
        } else {
            console.log(`Answer failed: Original caller (UID: ${data.to}) is no longer online.`);
        }
    });

    socket.on("end-call", ({ to }) => {
        const toSocketId = userSocketMap[to];
        if (toSocketId) {
            console.log(`Forwarding end-call signal to user (Socket: ${toSocketId})`);
            io.to(toSocketId).emit("call-ended");
        }
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
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

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;