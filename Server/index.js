
const express = require('express');
const mongoose = require('mongoose');
const Rooms = require('./DbRooms');
const Pusher = require("pusher");
const cors = require('cors');
const bodyParser = require('body-parser');
const Message = require('./dbmsg'); 

const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

const app = express();

const pusher = new Pusher({
    appId: "1935999",
    key: "f8a113bb8baf5e7d9826",
    secret: "e0e68e5310d9f1092089",
    cluster: "ap2",
    useTLS: true
});

app.use(cors());
app.use(bodyParser.json());

cloudinary.config({
  cloud_name: 'dpwx76ub2',
  api_key: '651975388482573',
  api_secret: '-KRk9RFBKRNWPpMMdDogCkGN3i8',
  secure: true
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const dbUrl = "mongodb+srv://santhoshrajan817:Santhosh007@whatsapp.vb52t.mongodb.net/whatsapp";
mongoose.connect(dbUrl);
const db = mongoose.connection;

db.once("open", () => {
    console.log("DB connected");

    const roomCollection = db.collection("rooms");
    const changeStreamRooms = roomCollection.watch();
    changeStreamRooms.on("change", (change) => {
        if(change.operationType === "insert"){
            const roomDetails = change.fullDocument;
            pusher.trigger("room", "inserted", roomDetails);
        } else {
            console.log("Event not triggered for room");
        }
    });

    const msgCollection = db.collection("messages");
    const changeStreamMessages = msgCollection.watch();
    changeStreamMessages.on("change", (change) => {
        if(change.operationType === "insert"){
            const messageDetails = change.fullDocument;
            pusher.trigger("message", "inserted", messageDetails);
        } else {
            console.log("Event not triggered for message");
        }
    });
});

app.get("/", (req, res) => {
    res.send("Hello from the WhatsApp Clone Server!");
});

app.get("/all/rooms", (req, res) => {
    Rooms.find()
        .then((rooms) => res.status(200).json({ data: rooms }))
        .catch((err) => res.status(500).send("Internal Server Error"));
});

app.get("/room/:id", (req, res) => {
    Rooms.findOne({ _id: req.params.id })
        .then((room) => res.status(200).json({ data: room }))
        .catch((err) => res.status(500).send("Internal Server Error"));
});

app.get("/messages/:id", (req, res) => {
    Message.find({ roomId: req.params.id })
        .then((result) => res.status(200).json({ message: result }))
        .catch((err) => res.status(500).send("Error fetching messages"));
});

app.post("/messages/new", (req, res) => {
    const dbMessage = new Message(req.body);
    dbMessage.save()
        .then((result) => res.status(201).json({ data: result }))
        .catch((err) => res.status(500).send("Error saving message"));
});

app.post("/messages/new/audio", upload.single('audio'), (req, res) => {
    if (!req.file) return res.status(400).send("No audio file uploaded.");
    
    const readableAudioStream = new Readable();
    readableAudioStream.push(req.file.buffer);
    readableAudioStream.push(null);

    const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "video" }, 
        (error, result) => {
            if (error) return res.status(500).send("Error uploading to cloud.");
            const dbMessage = new Message({
                name: req.body.name,
                timestamp: req.body.timestamp,
                uid: req.body.uid,
                roomId: req.body.roomId,
                messageType: 'audio',
                audioUrl: result.secure_url
            });
            dbMessage.save()
                .then((savedMessage) => res.status(201).json(savedMessage))
                .catch(err => res.status(500).send("Error saving audio message to DB."));
        }
    );
    readableAudioStream.pipe(uploadStream);
});

app.post("/messages/new/file", upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send("No file uploaded.");
    
    let resourceType = 'auto'; 
    
    const readableFileStream = new Readable();
    readableFileStream.push(req.file.buffer);
    readableFileStream.push(null);

    const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: resourceType, public_id: req.file.originalname },
        (error, result) => {
            if (error) return res.status(500).send("Error uploading to cloud.");

            const dbMessage = new Message({
                name: req.body.name,
                timestamp: req.body.timestamp,
                uid: req.body.uid,
                roomId: req.body.roomId,
                messageType: req.body.messageType,
                fileUrl: result.secure_url,
                fileName: req.file.originalname
            });
            dbMessage.save()
                .then((savedMessage) => res.status(201).json(savedMessage))
                .catch(err => res.status(500).send("Error saving file message to DB."));
        }
    );
    readableFileStream.pipe(uploadStream);
});

app.delete("/messages/clear/:roomId", (req, res) => {
    const { roomId } = req.params;
    if (!roomId) return res.status(400).send("Room ID is required.");
    
    Message.deleteMany({ roomId: roomId })
        .then(result => res.status(200).send({ message: `Successfully cleared ${result.deletedCount} messages.` }))
        .catch(err => res.status(500).send("Error clearing chat."));
});

app.delete("/messages/delete/:messageId", (req, res) => {
    const { messageId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
        return res.status(400).send("Invalid Message ID format.");
    }

    Message.findByIdAndDelete(messageId)
        .then(result => {
            if (!result) return res.status(404).send({ message: "Message not found." });
            res.status(200).send({ message: `Message ${messageId} deleted successfully.` });
        })
        .catch(err => res.status(500).send("Error deleting message."));
});

app.post("/group/create", (req, res) => {
    const { name, avatar } = req.body;
    if (!name) return res.status(400).json({ message: "Room name is required" });
    
    let room = new Rooms({ name, avatar });
    room.save()
        .then((result) => res.status(201).json({ data: result }))
        .catch((err) => res.status(500).json({ message: "Error creating room" }));
});
app.delete("/room/delete/:roomId", async (req, res) => {
    const { roomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
        return res.status(400).send("Invalid Room ID format.");
    }

    try {
        const deletedRoom = await Rooms.findByIdAndDelete(roomId);

        if (!deletedRoom) {
            return res.status(404).send({ message: "Room not found." });
        }

        await Message.deleteMany({ roomId: roomId });
        
        pusher.trigger("room", "deleted", { id: roomId });

        res.status(200).send({ message: `Room '${deletedRoom.name}' and all its messages have been deleted.` });

    } catch (err) {
        console.error("Error deleting room:", err);
        res.status(500).send("Error deleting room.");
    }
});
app.post("/room/:roomId/music-event", async (req, res) => {
    const { roomId } = req.params;
    const { eventType, eventData } = req.body;

    let updateData = {};
    const timestamp = new Date();

    if (eventType === 'play-song') {
        updateData = {
            currentSongUrl: eventData.url,
            currentSongTitle: eventData.title,
            isPlaying: true,
            lastEventTimestamp: timestamp,
        };
    } else if (eventType === 'pause-song') {
        updateData = {
            isPlaying: false,
            lastEventTimestamp: timestamp,
        };
    } else if (eventType === 'stop-song') {
        updateData = {
            currentSongUrl: null,
            currentSongTitle: null,
            isPlaying: false,
            lastEventTimestamp: timestamp,
        };
    } else {
        return res.status(400).send("Invalid event type.");
    }
    
    try {
        await Rooms.findByIdAndUpdate(roomId, updateData);
        res.status(200).send("Music state updated successfully.");
    } catch (error) {
        res.status(500).send("Error updating music state.");
    }
});

app.get("/room/:roomId/music-state", (req, res) => {
    const { roomId } = req.params;
    Rooms.findById(roomId)
        .select('currentSongUrl currentSongTitle isPlaying') 
        .then(room => {
            if (!room) return res.status(404).send("Room not found.");
            res.status(200).json(room);
        })
        .catch(err => res.status(500).send("Error fetching music state."));
});
app.get("/api/music/search", async (req, res) => {
    const { q } = req.query; // Get the search query from "?q=leo"

    if (!q) {
        return res.status(400).json({ message: "Search query 'q' is required." });
    }

    try {
        const deezerResponse = await axios.get(`https://api.deezer.com/search?q=${encodeURIComponent(q)}`);
        
        // The actual list of songs is in the 'data' property of Deezer's response.
        // We send just that part back to our frontend to keep it clean.
        res.status(200).json(deezerResponse.data.data || []);

    } catch (error) {
        console.error("Error fetching from Deezer API:", error.message);
        res.status(500).json({ message: "Failed to fetch songs from Deezer." });
    }
});
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});