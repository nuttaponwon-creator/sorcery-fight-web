// src/core/Networking.js

export class Networking {
    constructor(gameState, remotePlayerClass, spawnObjectCallback) {
        this.gameState = gameState;
        this.RemotePlayer = remotePlayerClass;
        this.spawnObject = spawnObjectCallback;
        this.socket = null;
        this.remotePlayers = {}; 
        this.isHost = false;
    }

    connect(playerData) {
        if (this.socket) {
            this.socket.emit('joinGame', playerData);
            return;
        }

        const protocol = window.location.protocol;
        const host = window.location.hostname;
        const port = host === 'localhost' ? ':3000' : '';
        this.socket = io(`${protocol}//${host}${port}`);

        this.socket.on('connect', () => {
            console.log('Connected to server!');
            this.socket.emit('joinGame', playerData);
        });

        this.socket.on('setHost', (val) => {
            console.log('Am I host?', val);
            this.isHost = val;
        });

        this.socket.on('roomInfo', (data) => {
            console.log(`[CLIENT ${Date.now()}] roomInfo received:`, data);
            if (data && data.roomCode) {
                this.roomCode = data.roomCode;
                if (this.onRoomJoined) this.onRoomJoined(data.roomCode);
            } else {
                console.error('[CLIENT] roomInfo received but roomCode is missing!', data);
            }
        });

        this.socket.on('currentPlayers', (players) => {
            Object.keys(players).forEach((id) => {
                if (id !== this.socket.id) {
                    this.addRemotePlayer(id, players[id]);
                }
            });
        });

        this.socket.on('newPlayer', (playerInfo) => {
            this.addRemotePlayer(playerInfo.id, playerInfo);
        });

        this.socket.on('playerMoved', (playerInfo) => {
            if (this.remotePlayers[playerInfo.id]) {
                this.remotePlayers[playerInfo.id].updateState(playerInfo);
            }
        });

        this.socket.on('playerHealthUpdated', (data) => {
            if (this.remotePlayers[data.id]) {
                this.remotePlayers[data.id].health = data.health;
            }
        });

        this.socket.on('playerDied', (id) => {
            if (this.remotePlayers[id]) {
                this.remotePlayers[id].isDead = true;
            }
        });

        this.socket.on('playerActed', (data) => {
            if (this.remotePlayers[data.id]) {
                this.remotePlayers[data.id].performAction(data.type, data.angle);
            }
        });

        this.socket.on('playerDisconnected', (id) => {
            if (this.remotePlayers[id]) {
                delete this.remotePlayers[id];
            }
        });

        // NEW: Leaderboard Update
        this.socket.on('leaderboardUpdate', (data) => {
            if (this.onLeaderboardUpdate) this.onLeaderboardUpdate(data);
        });

        // NEW: Ready Update
        this.socket.on('readyUpdate', (data) => {
            if (this.onReadyUpdate) this.onReadyUpdate(data);
        });

        // NEW: Game Start
        this.socket.on('gameStart', () => {
            if (this.onGameStart) this.onGameStart();
        });

        // NEW: Chat Messages
        this.socket.on('newChatMessage', (data) => {
            if (this.onChatMessage) this.onChatMessage(data);
        });

        // Zombie Sync Events
        this.socket.on('remoteZombieHit', (data) => {
            if (this.onRemoteZombieHit) this.onRemoteZombieHit(data);
        });

        this.socket.on('remoteZombieSpawn', (zombieData) => {
            if (!this.isHost) {
                if (this.onRemoteZombieSpawn) this.onRemoteZombieSpawn(zombieData);
            }
        });

        this.socket.on('remoteZombieDeath', (zombieId) => {
            if (this.onRemoteZombieDeath) this.onRemoteZombieDeath(zombieId);
        });

        // NEW: Full Zombie Position Sync
        this.socket.on('remoteZombieUpdate', (zombies) => {
            if (!this.isHost) {
                if (this.onRemoteZombieUpdate) this.onRemoteZombieUpdate(zombies);
            }
        });
    }

    addRemotePlayer(id, info) {
        // If player already exists (re-joining with same ID), update it instead of creating new
        if (this.remotePlayers[id]) {
            this.remotePlayers[id].isDead = false;
            this.remotePlayers[id].type = info.type;
            this.remotePlayers[id].name = info.name || 'Sorcerer';
            return;
        }
        this.remotePlayers[id] = new this.RemotePlayer(info.type, info.x, info.y, this.spawnObject);
        this.remotePlayers[id].id = id;
        this.remotePlayers[id].name = info.name || 'Sorcerer';
        this.remotePlayers[id].health = info.health;
        this.remotePlayers[id].isDead = info.isDead;
    }

    sendMovement(x, y, angle) {
        if (this.socket) this.socket.emit('playerMovement', { x, y, angle });
    }

    sendHealthUpdate(health) {
        if (this.socket) this.socket.emit('playerHealthUpdate', { health });
    }

    sendScore(score) {
        if (this.socket) this.socket.emit('updateScore', score);
    }

    sendChatMessage(msg) {
        if (this.socket) this.socket.emit('chatMessage', msg);
    }

    sendReady(val) {
        if (this.socket) this.socket.emit('playerReady', val);
    }

    sendDeath() {
        if (this.socket) this.socket.emit('playerDeath');
    }

    sendAction(type, angle) {
        if (this.socket) this.socket.emit('playerAction', { type, angle });
    }

    // Zombie Sync Methods
    sendZombieSpawn(zombieData) {
        if (this.socket && this.isHost) this.socket.emit('zombieSpawn', zombieData);
    }

    sendZombieDeath(zombieId) {
        if (this.socket) this.socket.emit('zombieDeath', zombieId);
    }

    sendZombieHit(zombieId, damage) {
        if (this.socket) {
            this.socket.emit('zombieHit', { zombieId, damage });
        }
    }

    sendZombieUpdate(zombies) {
        if (this.socket && this.isHost) this.socket.emit('zombieUpdate', zombies);
    }

    updateRemotePlayers(camera) {
        Object.values(this.remotePlayers).forEach(rp => rp.update(camera));
    }

    drawRemotePlayers(ctx) {
        Object.values(this.remotePlayers).forEach(rp => rp.draw(ctx));
    }
}
