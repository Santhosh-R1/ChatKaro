const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema({
    message: { type: String }, // For text messages, not required for other types
    name: { type: String, required: true },
    timestamp: { type: String, required: true },
    uid: { type: String, required: true },
    roomId: { type: String, required: true },
    
    // --- NEW & UPDATED FIELDS for multiple message types ---
    messageType: { 
        type: String, 
        // Enforce a specific list of allowed message types
        enum: ['text', 'audio', 'image', 'video', 'document', 'location'],
        default: 'text' 
    },
    fileUrl: { type: String },  // URL for images, videos, documents from Cloudinary
    audioUrl: { type: String }, // URL for audio from Cloudinary
    fileName: { type: String }, // Original name of the uploaded file (e.g., "report.pdf")
    location: {                 // For location messages
      lat: { type: Number },
      lon: { type: Number },
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt
});

module.exports = mongoose.model("messages", messageSchema);