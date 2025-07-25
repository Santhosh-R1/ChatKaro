const mongoose = require('mongoose')
const roomSchema = new mongoose.Schema(
    {
        name: { type: String },
        avatar: { type: String } 
    },{
        timestamps:true
    }
)
module.exports = new mongoose.model("rooms", roomSchema)