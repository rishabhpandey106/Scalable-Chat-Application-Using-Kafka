import React, { useContext, useEffect, useState } from "react";
import { ChatContext } from "../../Context/ChatContext";
import io from "socket.io-client";
import "./Rooms.css";

const Rooms = () => {
  const { api } = useContext(ChatContext);
  const [socket, setSocket] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [messages, setMessages] = useState({});
  const [messageInput, setMessageInput] = useState("");
  const [joinRoomPrompt, setJoinRoomPrompt] = useState(false);
  const [roomToJoin, setRoomToJoin] = useState("");
  const [activeRoom, setActiveRoom] = useState(null);

  useEffect(() => {
    const newSocket = io(api);
    setSocket(newSocket);

    return () => newSocket.close();
  }, [api]);

  useEffect(() => {
    if (!socket) return;

    // socket.emit("fetchMessages", activeRoom);
    // const userRooms = localStorage.getItem('userRooms') ? JSON.parse(localStorage.getItem('userRooms')) : [];
    // setRooms(userRooms);
    // console.log("rooms- ",rooms)
    socket.emit("fetchMessages", activeRoom);
    

    socket.on("fetchedMessages", (fetchedMessages) => {
      console.log("ftchedmsg", fetchedMessages)
      setMessages((prevMessages) => ({
        ...prevMessages,
        [activeRoom]: fetchedMessages,
      }));
    });

    socket.on("roommessage", (message) => {
      setMessages((prevMessages) => ({
        ...prevMessages,
          [activeRoom]: [...(prevMessages[activeRoom] || []), message],
      }));
      console.log("roommsg", message);
    });
  
    // socket.on("fetchedMessages", (fetchedMessages) => {
    //   setMessages(fetchedMessages.reduce((acc, message) => {
    //     return {
    //       ...acc,
    //       [message.room]: [...(acc[message.room] || []), message],
    //     };
    //   }, {}));
    // });
    

    return () => {
      socket.off("roommessage");
      socket.off("fetchedMessages");
    };
  }, [socket, activeRoom]);

  const joinRoom = (roomName) => {
    if (socket && !rooms.includes(roomName)) {
      socket.emit("joinRoom", { room: roomName, sender: localStorage.getItem("username") });
      // const updatedRooms = [...rooms, roomName];
      setRooms((prevRooms) => [...prevRooms, roomName]);
      // setRooms(updatedRooms);
      // localStorage.setItem('userRooms', JSON.stringify(updatedRooms));
      setActiveRoom(roomName);
    }
  };

  const leaveRoom = (roomName) => {
    if (socket && rooms.includes(roomName)) {
      socket.emit("leaveRoom", roomName);
      // const updatedRooms = rooms.filter((room) => room !== roomName);
      // setRooms(updatedRooms);
      // localStorage.setItem('userRooms', JSON.stringify(updatedRooms));
      setRooms((prevRooms) => prevRooms.filter((room) => room !== roomName));
      setMessages((prevMessages) => {
        const updatedMessages = { ...prevMessages };
        delete updatedMessages[roomName];
        return updatedMessages;
      });

      if (activeRoom === roomName) {
        setActiveRoom(null);
      }
    }
  };

  const sendMessage = () => {
    if (socket && messageInput.trim() !== "" && activeRoom) {
      console.log('activeRoom sendmessage', activeRoom)
      const message = { room: activeRoom, sender: localStorage.getItem("username"), content: messageInput };
      console.log("sendmessage - ", message);
      socket.emit("roommessage", message);
      console.log("emitted- roomessage")
      // setMessages((prevMessages) => ({
      //   ...prevMessages,
      //   [activeRoom]: [...(prevMessages[activeRoom] || []), message],
      // }),console.log("sndmsg", message));
      setMessageInput("");
    }
  };

  const handleJoinRoom = () => {
    setJoinRoomPrompt(true);
  };

  const handleJoinRoomSubmit = (e) => {
    e.preventDefault();
    joinRoom(roomToJoin);
    setRoomToJoin("");
    setJoinRoomPrompt(false);
  };

  const handleRoomClick = (roomName) => {
    setActiveRoom(roomName);
    console.log('activeRoom', activeRoom)
  };

  const returnToMainPanel = () => {
    window.location.href = "/mainpanel"
  }

  return (
    <div className="mainpanel-container">
      <div className="chat-window">
        <div className="msg-lists">
          {rooms.map((room) => (
            <div key={room} className={activeRoom === room ? "active-room" : ""} onClick={() => handleRoomClick(room)}>
              {room} {activeRoom === room && <button onClick={() => leaveRoom(room)}>Leave</button>}
            </div>
          ))}
          <button onClick={handleJoinRoom}>Join Other Room +</button>
          <button onClick={returnToMainPanel}>MainPanel</button>
          {joinRoomPrompt && (
            <form onSubmit={handleJoinRoomSubmit}>
              <input
                type="text"
                placeholder="Enter Room ID"
                value={roomToJoin}
                onChange={(e) => setRoomToJoin(e.target.value)}
              />
              <button type="submit">Join Room</button>
            </form>
          )}
        </div>
        <div className="msg-window">
          {!activeRoom? <h1 className="noRoomSelected">!!! Click On Any Room To See The Messages !!! &nbsp; <h2 className="noRooms">!!! If There Isn't Any Rooms, Please Create One !!!</h2></h1>:""}
          {activeRoom && (
            <>
              <h2>{activeRoom}</h2>
              <div className="messages-in-window">
                {messages[activeRoom]?.map((message, index) => (
                  <div key={index} className="message">
                    <span className="sender">{message.sender === localStorage.getItem("username") ? "You" : message.sender}</span>{" --> "}
                    <span className="content">{message.content}</span>
                  </div>
                )).reverse()}
              </div>
              <div className="input-container">
                <input
                  type="text"
                  placeholder={`Type your message in ${activeRoom}...`}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                />
                <button onClick={sendMessage}>Send</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Rooms;
