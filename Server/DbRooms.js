const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    name: String,
    avatar: String,
    currentSongUrl: { type: String, default: null },
    currentSongTitle: { type: String, default: null },
    isPlaying: { type: Boolean, default: false },
    lastEventTimestamp: { type: Date, default: Date.now } // Helps in syncing
}, {
    timestamps: true
});

module.exports = mongoose.model("rooms", roomSchema);