// src/core/Networking.js

export class Networking {
    constructor(gameState, remotePlayerClass, spawnObjectCallback) {
        this.gameState = gameState;
        this.RemotePlayer = remotePlayerClass;
        this.spawnObject = spawnObjectCallback;
        this.socket = null;
        this.remotePlayers = {};
        this.isHost = false;
        this.mode = 'pve'; // 'pve' | 'pvp'
    }

    connect(playerData) {
        if (this.socket) {
            this.socket.emit('joinGame', playerData);
            return;
        }

        if (typeof io === 'undefined') {
            console.error("[NET] FATAL: Socket.io (io) is not defined! Check script tag in index.html.");
            return;
        }

        const protocol = window.location.protocol === 'file:' ? 'http:' : window.location.protocol;
        const host = window.location.hostname === '' ? 'localhost' : window.location.hostname;
        
        // If we are on localhost, use port 4000. If on production, use current origin.
        const serverUrl = (host === 'localhost' || host === '127.0.0.1') ? `http://localhost:4000` : window.location.origin;
        console.log(`[NET] Attempting connection to: ${serverUrl}`);
        
        try {
            this.socket = io(serverUrl, {
                reconnectionAttempts: 5,
                timeout: 10000,
                transports: ['websocket', 'polling']
            });
        } catch (e) {
            console.error("[NET] Socket.io Initialization Error:", e);
            return;
        }

        this.socket.on('connect_error', (err) => {
            console.error('[NET] Connection Error:', err);
        });

        this.socket.on('connect', () => {
            console.log('[NET] Connected to server!');
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
            if (data.id === this.socket.id) {
                if (this.gameState.player) this.gameState.player.health = data.health;
            } else if (this.remotePlayers[data.id]) {
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
            if (this.onLeaderboard) this.onLeaderboard(data);
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
            if (this.onChat) this.onChat(data.name, data.message);
        });

        // NEW: Room mode (pvp/pve)
        this.socket.on('roomMode', (mode) => {
            this.mode = mode;
            if (this.onRoomMode) this.onRoomMode(mode);
        });

        this.socket.on('syncWave', (wave) => {
            if (this.onSyncWave) this.onSyncWave(wave);
        });

        this.socket.on('syncScore', (score) => {
            if (this.onSyncScore) this.onSyncScore(score);
        });

        // ─── PVP Events ───────────────────────────────────────────────────────
        this.socket.on('pvpKill', (data) => {
            if (this.onPvpKill) this.onPvpKill(data);
        });
        this.socket.on('pvpScoreUpdate', (scores) => {
            if (this.onPvpScoreUpdate) this.onPvpScoreUpdate(scores);
        });
        this.socket.on('pvpRoundStart', (data) => {
            if (this.onPvpRoundStart) this.onPvpRoundStart(data);
        });
        this.socket.on('pvpRoundEnd', (data) => {
            if (this.onPvpRoundEnd) this.onPvpRoundEnd(data);
        });
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

        // NEW: Projectile Sync
        this.socket.on('remoteProjectileSpawn', (data) => {
            if (this.onRemoteProjectileSpawn) this.onRemoteProjectileSpawn(data);
        });

        this.socket.on('newHost', (hostId) => {
            console.log('New Host assigned:', hostId);
            if (hostId === this.socket.id) {
                this.isHost = true;
            }
            if (this.onNewHost) this.onNewHost(hostId);
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

    sendDamage(amount) {
        if (this.socket) this.socket.emit('playerTakeDamage', { amount });
    }

    // PVP: deal damage to a specific remote player
    sendPvpDamage(targetId, amount) {
        if (this.socket) this.socket.emit('pvpHit', { targetId, damage: amount });
    }

    sendHeal(amount) {
        if (this.socket) this.socket.emit('playerHeal', { amount });
    }

    sendScore(score) {
        if (this.socket) this.socket.emit('updateScore', score);
    }

    sendChatMessage(msg) {
        if (this.socket) this.socket.emit('chatMessage', msg);
    }

    sendWave(wave) {
        if (this.socket && this.isHost) this.socket.emit('updateWave', wave);
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

    sendProjectileSpawn(data) {
        if (this.socket) this.socket.emit('projectileSpawn', { ...data, ownerId: this.socket.id });
    }

    // Zombie Sync Methods
    sendZombieSpawn(zombieData) {
        if (this.socket && this.isHost) this.socket.emit('zombieSpawn', zombieData);
    }

    sendZombieDeath(zombieId, points = 10) {
        if (this.socket) this.socket.emit('zombieDeath', { id: zombieId, points });
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
