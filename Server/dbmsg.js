const mongoose = require('mongoose')

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

module.exports = mongoose.model("Message", MessageSchema);