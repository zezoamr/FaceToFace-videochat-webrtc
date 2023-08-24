// Back-end code
const express = require("express");
const app = express();
const httpServer = require("http").createServer(app);
const io = require("socket.io")(httpServer, {
  cors: {
    origin: "*",
  },
  maxHttpBufferSize: 1e8,
});

io.on("connection", (socket) => {

    // Join room
    socket.on('joinRoom', ({ room }) => {
        console.log('room ' + room)
        console.log('user id '+ socket.id)
        socket.join(room)
        socket.broadcast.to(room).emit('userJoined', room)
    })

    // Leave room
    socket.on('leaving', ({room}) => {
        console.log('disconnecting from room ' + room + ' user' + socket.id + ' has left')
        socket.broadcast.to(room).emit('userLeft', socket.id)
    })

    // Handle messages from peers
    socket.on('offer', ({ offer, roomid }) => {
        console.log('offer ' + JSON.stringify(offer))
        socket.broadcast.to(roomid).emit('messageFromPeer', { type: 'offer', offer })
        console.log('sent offer \n')
    })

    socket.on('answer', ({ answer, roomid }) => {
        console.log('answer ' + JSON.stringify(answer))
        socket.broadcast.to(roomid).emit('messageFromPeer', { type: 'answer', answer })
    })

    socket.on('candidate', ({ candidate, roomid }) => {
        console.log('candidate ' + JSON.stringify(candidate) + '\n roomid' + JSON.stringify(roomid))
        socket.broadcast.to(roomid).emit('messageFromPeer', { type: 'candidate', candidate })
    })
});

httpServer.listen(3000, () => console.log(`Server listening on port ${3000}`));
