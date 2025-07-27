const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  avatar: { type: String },
  updatedAt: { type: Date, default: Date.now },
  currentSongUrl: { type: String, default: null },
  currentSongTitle: { type: String, default: null },
  isPlaying: { type: Boolean, default: false },
  members: [{ type: String, required: true }]
}, { timestamps: true });

module.exports = mongoose.model("Room", RoomSchema);