const mongoose = require('mongoose');

const groupChatMessageSchema = new mongoose.Schema({
  senderId: String,
  content: String,
  createdAt: { type: Date, default: Date.now },
});

const GroupChatMessage = mongoose.model('GroupChatMessage', groupChatMessageSchema);

module.exports = GroupChatMessage;
