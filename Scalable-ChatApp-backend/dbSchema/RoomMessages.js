const mongoose = require('mongoose');

const roomChatMessageSchema = new mongoose.Schema({
room: String,
sender: String,
content: String,
createdAt: { type: Date, default: Date.now }
});

const RoomChatMessage = mongoose.model('RoomChatMessage', roomChatMessageSchema);

module.exports = RoomChatMessage;