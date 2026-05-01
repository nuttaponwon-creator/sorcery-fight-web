const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, './')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

let rooms = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('joinGame', (data) => {
        let { roomCode, name, type, x, y, angle, health, maxHealth, mode } = data;
        if (!roomCode) roomCode = 'LOBBY';
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
            rooms[room] = {
                players: {},
                hostId: null,
                gameStarted: false,
                mode: mode || 'pve',  // 'pve' or 'pvp'
                round: 1,
                wave: 1,
                score: 0,
                roundActive: false,
                killsToWin: 5
            };
        }

        const roomData = rooms[room];
        roomData.players[socket.id] = {
            id: socket.id,
            name: name || 'Sorcerer',
            type, x, y, angle, health, maxHealth,
            score: 0, kills: 0, pvpKills: 0, isDead: false, isReady: false
        };

        if (!roomData.hostId || !roomData.players[roomData.hostId]) {
            roomData.hostId = socket.id;
        }
        if (Object.keys(roomData.players).length === 1) {
            roomData.hostId = socket.id;
        }

        socket.emit('currentPlayers', roomData.players);
        socket.emit('setHost', socket.id === roomData.hostId);
        socket.emit('roomInfo', { 
            roomCode: room, 
            mode: roomData.mode,
            wave: roomData.wave,
            score: roomData.score
        });
        socket.emit('roomMode', roomData.mode);
        socket.emit('syncWave', roomData.wave);
        socket.emit('syncScore', roomData.score);

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
                    // PVP: start first round
                    if (roomData.mode === 'pvp') {
                        startPvpRound(room);
                    }
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

    socket.on('playerTakeDamage', (data) => {
        const room = socket.data.room;
        if (room && rooms[room] && rooms[room].players[socket.id]) {
            const roomData = rooms[room];
            const p = roomData.players[socket.id];
            if (p.isDead) return;

            const damage = data.amount || 5;
            p.health -= damage;
            
            if (p.health <= 0) {
                p.health = 0;
                p.isDead = true;
                io.to(room).emit('playerDied', socket.id);
            }
            io.to(room).emit('playerHealthUpdated', { id: socket.id, health: p.health });
        }
    });

    // ─── PVP Hit ──────────────────────────────────────────────────────────────
    socket.on('pvpHit', (data) => {
        const room = socket.data.room;
        if (!room || !rooms[room]) return;
        const roomData = rooms[room];
        if (roomData.mode !== 'pvp' || !roomData.roundActive) return;

        const { targetId, damage } = data;
        const target = roomData.players[targetId];
        const attacker = roomData.players[socket.id];
        if (!target || target.isDead || !attacker) return;

        target.health -= damage;

        if (target.health <= 0) {
            target.health = 0;
            target.isDead = true;

            // Kill credit
            attacker.pvpKills++;

            io.to(room).emit('playerDied', targetId);
            io.to(room).emit('playerHealthUpdated', { id: targetId, health: 0 });
            io.to(room).emit('pvpKill', {
                killerId: socket.id,
                killerName: attacker.name,
                victimId: targetId,
                victimName: target.name,
                killerKills: attacker.pvpKills
            });
            io.to(room).emit('pvpScoreUpdate', getPvpScores(room));

            // Check win condition (first to killsToWin)
            if (attacker.pvpKills >= roomData.killsToWin) {
                roomData.roundActive = false;
                io.to(room).emit('pvpRoundEnd', {
                    winnerId: socket.id,
                    winnerName: attacker.name,
                    round: roomData.round,
                    scores: getPvpScores(room)
                });
                // Auto-start next round after 5 seconds
                setTimeout(() => {
                    if (rooms[room]) startPvpRound(room);
                }, 5000);
                return;
            }

            // Check if all enemies of attacker are dead → round end
            const alivePlayers = Object.values(roomData.players).filter(p => !p.isDead);
            if (alivePlayers.length <= 1) {
                roomData.roundActive = false;
                const survivor = alivePlayers[0];
                io.to(room).emit('pvpRoundEnd', {
                    winnerId: survivor ? survivor.id : socket.id,
                    winnerName: survivor ? survivor.name : attacker.name,
                    round: roomData.round,
                    scores: getPvpScores(room)
                });
                setTimeout(() => {
                    if (rooms[room]) startPvpRound(room);
                }, 5000);
            }
        } else {
            io.to(room).emit('playerHealthUpdated', { id: targetId, health: target.health });
        }
    });

    socket.on('playerHeal', (data) => {
        const room = socket.data.room;
        if (room && rooms[room] && rooms[room].players[socket.id]) {
            const p = rooms[room].players[socket.id];
            if (p.isDead) return;
            p.health = Math.min(p.maxHealth, p.health + (data.amount || 10));
            io.to(room).emit('playerHealthUpdated', { id: socket.id, health: p.health });
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
            // Always broadcast to everyone so health bars update instantly
            io.to(room).emit('remoteZombieHit', { ...data, attackerId: socket.id });
        }
    });

    socket.on('zombieDeath', (data) => {
        const room = socket.data.room;
        if (room && rooms[room]) {
            const roomData = rooms[room];
            if (roomData.players[socket.id]) {
                const p = roomData.players[socket.id];
                p.kills += 1;
                p.score += (data.points || 10);
                io.to(room).emit('leaderboardUpdate', getLeaderboard(room));
            }
            socket.to(room).emit('remoteZombieDeath', data.id || data);
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
        if (room && rooms[room]) {
            const roomData = rooms[room];
            if (roomData.players[socket.id]) {
                roomData.players[socket.id].score = score;
            }
            // Update room's global score (if host sends it or based on player score)
            // For now, let's just track individual scores and use roomData.score for wave-related things
            if (socket.id === roomData.hostId) {
                roomData.score = score;
                socket.to(room).emit('syncScore', score);
            }
            io.to(room).emit('leaderboardUpdate', getLeaderboard(room));
        }
    });

    socket.on('updateWave', (wave) => {
        const room = socket.data.room;
        if (room && rooms[room] && socket.id === rooms[room].hostId) {
            rooms[room].wave = wave;
            socket.to(room).emit('syncWave', wave);
        }
    });

    socket.on('chatMessage', (msg) => {
        const room = socket.data.room;
        if (room && rooms[room] && rooms[room].players[socket.id]) {
            io.to(room).emit('newChatMessage', { name: rooms[room].players[socket.id].name, message: msg });
        }
    });

    socket.on('projectileSpawn', (data) => {
        const room = socket.data.room;
        if (room) {
            // Attach sender's ID as ownerId for remote tracking
            socket.to(room).emit('remoteProjectileSpawn', { ...data, ownerId: socket.id });
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

// ─── PVP Round Helpers ────────────────────────────────────────────────────────
function startPvpRound(room) {
    const roomData = rooms[room];
    if (!roomData) return;

    roomData.round++;
    roomData.roundActive = true;

    // Respawn all players: reset hp & isDead
    const spawnPoints = [
        { x: 400, y: 400 }, { x: 2000, y: 400 },
        { x: 400, y: 2000 }, { x: 2000, y: 2000 },
        { x: 1200, y: 300 }, { x: 1200, y: 2100 }
    ];
    let spawnIdx = 0;

    Object.values(roomData.players).forEach(p => {
        const sp = spawnPoints[spawnIdx % spawnPoints.length];
        spawnIdx++;
        p.isDead = false;
        p.health = p.maxHealth;
        p.x = sp.x;
        p.y = sp.y;
    });

    io.to(room).emit('pvpRoundStart', {
        round: roomData.round,
        killsToWin: roomData.killsToWin,
        players: Object.values(roomData.players).map(p => ({
            id: p.id, name: p.name, x: p.x, y: p.y,
            health: p.health, maxHealth: p.maxHealth, pvpKills: p.pvpKills
        })),
        scores: getPvpScores(room)
    });
}

function getPvpScores(room) {
    if (!rooms[room]) return [];
    return Object.values(rooms[room].players)
        .map(p => ({ id: p.id, name: p.name, pvpKills: p.pvpKills, isDead: p.isDead }))
        .sort((a, b) => b.pvpKills - a.pvpKills);
}

function getReadyStatus(room) {
    if (!rooms[room]) return [];
    return Object.values(rooms[room].players).map(p => ({ id: p.id, name: p.name, isReady: p.isReady }));
}

function getLeaderboard(room) {
    if (!rooms[room]) return [];
    const players = Object.values(rooms[room].players)
        .map(p => ({ name: p.name, score: p.score, kills: p.kills }))
        .sort((a, b) => b.score - a.score);
    if (players.length > 0) players[0].isMVP = true;
    return players.slice(0, 10);
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
