const mongoose = require('mongoose');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const GroupChatMessage = require("./dbSchema/GroupChatMessage");
const OneOnOneChatMessage = require("./dbSchema/OneOnOneChatMessage");
const RoomChatMessage = require("./dbSchema/RoomMessages");
const { Kafka } = require('kafkajs');
const fs = require('fs');

const app = express();

app.use(cors({
    origin: '*'
}));

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
    }
});

// Kafka initialization
const kafka = new Kafka({
  brokers: [''],
  ssl: {
      ca: [fs.readFileSync("./ca.pem", "utf-8")],
  },
  sasl: {
    username: "",
    password: "",
    mechanism: ""
  }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'healsync' });

const runConsumer = async () => {
await consumer.connect();
await consumer.subscribe({ topic: 'Messages' });

await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
        const { key, value } = message;
        const parsedMessage = JSON.parse(value.toString());
        if (key) {
            const timestamp = parseInt(key.toString());
            if(parsedMessage.room){
                const roomMessage = new RoomChatMessage({
                    room: parsedMessage.room,
                    sender: parsedMessage.sender,
                    content: parsedMessage.content,
                    createdAt: new Date(timestamp),
                });
                console.log(parsedMessage);
                try {
                    await roomMessage.save();
                    console.log("fetched from kafka");
                } catch (error) {
                    console.error('Error saving room message:', error.message);
                }
            }
            else if (parsedMessage.receiverId) {
                const oneOnOneMessage = new OneOnOneChatMessage({
                    senderId: parsedMessage.senderId,
                    receiverId: parsedMessage.receiverId,
                    content: parsedMessage.content,
                    createdAt: new Date(timestamp),
                });
                try {
                    await oneOnOneMessage.save();
                } catch (error) {
                    console.error('Error saving one-on-one message:', error.message);
                }
            } else {
                const groupChatMessage = new GroupChatMessage({
                    senderId: parsedMessage.senderId,
                    content: parsedMessage.content,
                    createdAt: new Date(timestamp),
                });
                try {
                    await groupChatMessage.save();
                } catch (error) {
                    console.error('Error saving group chat message:', error.message);
                }
            }
        } else {
            console.log('Message key not found.');
        }
    },
});
};

const runProducer = async () => {
  await producer.connect();
};

const sendMessage = async (key, message) => {
try {
    await producer.send({
        topic: 'Messages',
        messages: [{ key: key.toString(), value: JSON.stringify(message) }],
    });
} catch (error) {
    console.error('Error sending message:', error.message);
}
};

runConsumer().catch(console.error);
runProducer().catch(console.error);



mongoose.connect('YOUR_MONGO_URL', {
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

const users = {};
io.on('connection', (socket) => {
    console.log('New user connected ->', socket.id);
    socket.on('setUsername', (username) => {
        users[username] = socket;
        console.log(`Username set for ${socket.id}: ${username}`);
    });

    socket.on("fetchMessages", async (room) => {
        try {
          const messages = await RoomChatMessage.find({ room }).sort({ createdAt: 1 }).exec();

          socket.emit("fetchedMessages", messages);
        } catch (err) {
          console.error("Error fetching messages:", err);
        }
    });

    socket.on('message', async (data) => {
      const timestamp = new Date().getTime();
        const message = new GroupChatMessage({
            senderId: data.senderId,
            content: data.content,
        });
        await sendMessage(timestamp, message);
        io.emit('message', message);
    });

    socket.on("joinRoom", async ({ room, sender }) => {
        socket.join(room);
    });

    socket.on("roommessage", async (data) => {
        const { room, sender, content } = data;
        console.log("server roommessage event on - ",room,sender,content)
        const timestamp = new Date().getTime();

        // const newMessage = new RoomChatMessage({ room, sender, content });
        // try {
        //     await newMessage.save();
        // } catch (err) {
        //     console.error("Error saving message:", err);
        // }

        const newMessage = new RoomChatMessage({
            room: room,
            sender: sender,
            content: content
        })

        await sendMessage(timestamp , newMessage)

        io.to(room).emit("roommessage", newMessage);
        console.log("sended to roomsg event");
    });
    
    socket.on("leaveRoom", (roomName) => {
    socket.leave(roomName);
    });

    socket.on('privateMessage', async (data) => {
      const timestamp = new Date().getTime();
        const { username, content, senderId } = data;
        const message = new OneOnOneChatMessage({
            senderId: senderId,
            receiverId: username,
            content: content
        });
        await sendMessage(timestamp,message);
        const receiverSocket = users[username];
        if (receiverSocket) {
            receiverSocket.emit('privateMessage', message);
        } else {
            console.log('Receiver is not online or invalid.');
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        delete users[socket.id];
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
