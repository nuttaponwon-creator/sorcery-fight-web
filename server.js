const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// ✅ Serve static files from the CURRENT directory (root)
app.use(express.static(path.join(__dirname, './')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

let rooms = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('joinGame', (data) => {
        const { roomCode, name, type, x, y, angle, health, maxHealth } = data;
        const room = roomCode.toUpperCase();
        
        if (socket.data.room) {
            const oldRoom = socket.data.room;
            if (rooms[oldRoom]) {
                delete rooms[oldRoom].players[socket.id];
                socket.leave(oldRoom);
                if (rooms[oldRoom].hostId === socket.id) {
                    rooms[oldRoom].hostId = Object.keys(rooms[oldRoom].players)[0] || null;
                    if (rooms[oldRoom].hostId) io.to(rooms[oldRoom].hostId).emit('setHost', true);
                }
                if (Object.keys(rooms[oldRoom].players).length === 0) delete rooms[oldRoom];
            }
        }

        socket.join(room);
        socket.data.room = room;

        if (!rooms[room]) {
            rooms[room] = { players: {}, hostId: null, gameStarted: false };
        }

        const roomData = rooms[room];
        roomData.players[socket.id] = {
            id: socket.id,
            name: name || 'Sorcerer',
            type, x, y, angle, health, maxHealth,
            score: 0, kills: 0, isDead: false, isReady: false
        };

        if (!roomData.hostId || !roomData.players[roomData.hostId]) {
            roomData.hostId = socket.id;
        }

        if (Object.keys(roomData.players).length === 1) {
            roomData.hostId = socket.id;
        }

        socket.emit('currentPlayers', roomData.players);
        socket.emit('setHost', socket.id === roomData.hostId);
        socket.emit('roomInfo', { roomCode: room });

        socket.to(room).emit('newPlayer', roomData.players[socket.id]);
        io.to(room).emit('leaderboardUpdate', getLeaderboard(room));
        io.to(room).emit('readyUpdate', getReadyStatus(room));
    });

    socket.on('playerReady', (val) => {
        const room = socket.data.room;
        if (room && rooms[room]) {
            const roomData = rooms[room];
            if (roomData.players[socket.id]) {
                roomData.players[socket.id].isReady = val;
                io.to(room).emit('readyUpdate', getReadyStatus(room));
                const allReady = Object.values(roomData.players).every(p => p.isReady);
                if (allReady && Object.keys(roomData.players).length > 0) {
                    roomData.gameStarted = true;
                    io.to(room).emit('gameStart');
                }
            }
        }
    });

    socket.on('playerMovement', (data) => {
        const room = socket.data.room;
        if (room && rooms[room] && rooms[room].players[socket.id]) {
            const p = rooms[room].players[socket.id];
            p.x = data.x; p.y = data.y; p.angle = data.angle;
            socket.to(room).emit('playerMoved', p);
        }
    });

    socket.on('playerHealthUpdate', (data) => {
        const room = socket.data.room;
        if (room && rooms[room] && rooms[room].players[socket.id]) {
            rooms[room].players[socket.id].health = data.health;
            socket.to(room).emit('playerHealthUpdated', { id: socket.id, health: data.health });
        }
    });

    socket.on('playerDeath', () => {
        const room = socket.data.room;
        if (room && rooms[room] && rooms[room].players[socket.id]) {
            rooms[room].players[socket.id].isDead = true;
            socket.to(room).emit('playerDied', socket.id);
        }
    });

    socket.on('playerAction', (data) => {
        const room = socket.data.room;
        if (room) socket.to(room).emit('playerActed', { id: socket.id, ...data });
    });

    socket.on('zombieSpawn', (data) => {
        const room = socket.data.room;
        if (room && rooms[room] && socket.id === rooms[room].hostId) {
            socket.to(room).emit('remoteZombieSpawn', data);
        }
    });

    socket.on('zombieHit', (data) => {
        const room = socket.data.room;
        if (room && rooms[room]) {
            const hostId = rooms[room].hostId;
            if (hostId && hostId !== socket.id) {
                io.to(hostId).emit('remoteZombieHit', { ...data, attackerId: socket.id });
            }
        }
    });

    socket.on('zombieDeath', (id) => {
        const room = socket.data.room;
        if (room) {
            if (rooms[room].players[socket.id]) {
                rooms[room].players[socket.id].kills += 1;
                rooms[room].players[socket.id].score += 10;
                io.to(room).emit('leaderboardUpdate', getLeaderboard(room));
            }
            socket.to(room).emit('remoteZombieDeath', id);
        }
    });

    socket.on('zombieUpdate', (zombies) => {
        const room = socket.data.room;
        if (room && rooms[room] && socket.id === rooms[room].hostId) {
            socket.to(room).emit('remoteZombieUpdate', zombies);
        }
    });

    socket.on('updateScore', (score) => {
        const room = socket.data.room;
        if (room && rooms[room] && rooms[room].players[socket.id]) {
            rooms[room].players[socket.id].score = score;
            io.to(room).emit('leaderboardUpdate', getLeaderboard(room));
        }
    });

    socket.on('chatMessage', (msg) => {
        const room = socket.data.room;
        if (room && rooms[room] && rooms[room].players[socket.id]) {
            io.to(room).emit('newChatMessage', { name: rooms[room].players[socket.id].name, message: msg });
        }
    });

    socket.on('disconnect', () => {
        const room = socket.data.room;
        if (room && rooms[room]) {
            const roomData = rooms[room];
            const wasHost = socket.id === roomData.hostId;
            delete roomData.players[socket.id];
            
            if (wasHost) {
                const remainingPlayers = Object.keys(roomData.players);
                if (remainingPlayers.length > 0) {
                    roomData.hostId = remainingPlayers[0];
                    io.to(roomData.hostId).emit('setHost', true);
                    io.to(roomData.hostId).emit('newHost', roomData.hostId);
                } else {
                    roomData.hostId = null;
                }
            }

            io.to(room).emit('playerDisconnected', socket.id);
            io.to(room).emit('leaderboardUpdate', getLeaderboard(room));
            io.to(room).emit('readyUpdate', getReadyStatus(room));
            
            if (Object.keys(roomData.players).length === 0) delete rooms[room];
        }
        console.log('User disconnected:', socket.id);
    });
});

function getReadyStatus(room) {
    if (!rooms[room]) return [];
    return Object.values(rooms[room].players).map(p => ({ id: p.id, name: p.name, isReady: p.isReady }));
}

function getLeaderboard(room) {
    if (!rooms[room]) return [];
    const players = Object.values(rooms[room].players)
        .map(p => ({ name: p.name, score: p.score, kills: p.kills }))
        .sort((a, b) => b.score - a.score);
    
    // Mark MVP
    if (players.length > 0) players[0].isMVP = true;
    
    return players.slice(0, 10);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
