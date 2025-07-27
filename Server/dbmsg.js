const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema({
    message: { type: String }, 
    name: { type: String, required: true },
    timestamp: { type: String, required: true },
    uid: { type: String, required: true },
    roomId: { type: String, required: true },
    
    messageType: { 
        type: String, 
        enum: ['text', 'audio', 'image', 'video', 'document', 'location'],
        default: 'text' 
    },
    fileUrl: { type: String }, 
    audioUrl: { type: String }, 
    fileName: { type: String },
    location: {                 
      lat: { type: Number },
      lon: { type: Number },
    }
}, {
    timestamps: true 
});

module.exports = mongoose.model("messages", messageSchema);