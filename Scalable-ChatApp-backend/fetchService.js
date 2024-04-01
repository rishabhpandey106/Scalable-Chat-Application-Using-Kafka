const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const GroupChatMessage = require("./dbSchema/GroupChatMessage");
const OneOnOneChatMessage = require("./dbSchema/OneOnOneChatMessage");

const app = express();
app.use(cors());
mongoose.connect('mongodb+srv://', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('Error connecting to MongoDB:', err.message);
});

app.get('/api/chat/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const groupChatMessages = await GroupChatMessage.find().sort({ createdAt: 1 }).exec();
        const oneOnOneChatMessages = await OneOnOneChatMessage.find({
            $or: [{ senderId: username }, { receiverId: username }]
        }).sort({ createdAt: 1 }).exec();
        const result = {
            'group-chat': groupChatMessages,
        };

        oneOnOneChatMessages.forEach(message => {
            const key = message.senderId === username ? message.receiverId : message.senderId;
            if (!result[key]) {
                result[key] = [];
            }
            result[key].push(message);
        });
        res.json(result);
    } catch (error) {
        console.error('Error fetching chat details:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => {
    console.log(`fetchService running on port ${PORT}`);
});
