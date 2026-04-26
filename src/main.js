import { CONFIG, SKILL_SETTINGS } from './config.js';
import { input } from './core/Input.js';
import { Player } from './entities/Player.js';
import { RemotePlayer } from './entities/RemotePlayer.js';
import { Zombie } from './entities/Zombie.js';
import { 
    Particle, HollowPurple, MalevolentShrineObject, 
    CursedSpeech, RikaClaw, ManifestRika,
    PunchBox, BlueOrb, RedOrb, FireArrow, WorldSlash,
    InvertedSpear, KatanaSlash, TojiBullet, CleaveSlash
} from './entities/SkillObjects.js';
import { DropItem } from './entities/Drops.js';
import { Level } from './core/Level.js';
import { Networking } from './core/Networking.js';
import { audioManager } from './core/AudioManager.js';

console.log("Game Script Loaded! (Room-Based Multiplayer)");

// Initialize Audio
audioManager.init();

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score-display');
const healthBar = document.getElementById('health-bar');
const menuScreen = document.getElementById('menu-screen');
const skillsHud = document.getElementById('skills-hud');
const readyBtn = document.getElementById('ready-btn');
const readySection = document.getElementById('ready-section');
const readyList = document.getElementById('ready-list');
const spectatorOverlay = document.getElementById('spectator-overlay');
const spectatorTargetName = document.getElementById('spectator-target');
const roomInput = document.getElementById('room-input');
const joinRoomBtn = document.getElementById('join-room-btn');
const createRoomBtn = document.getElementById('create-room-btn');
const roomDisplay = document.getElementById('room-display');
const leaderList = document.getElementById('leader-list');

const level = new Level();
const networking = new Networking(null, RemotePlayer, (obj) => spawnObject(obj, false));

// Game State
let gameState = {
    active: false,
    gameStarted: false,
    isReady: false,
    isSpectating: false,
    score: 0,
    spawnTimer: 0,
    camera: { x: 0, y: 0 },
    player: null,
    wave: 1,
    killedInWave: 0,
    zombies: [],
    projectiles: [],
    particles: [],
    drops: []
};

// Networking Callbacks
networking.onRemoteZombieSpawn = (data) => {
    if (gameState.zombies.some(z => z.id === data.id)) return;
    const z = new Zombie(null, data.id);
    z.setPosition(data.x, data.y);
    z.speed = data.speed;
    gameState.zombies.push(z);
};

networking.onRemoteZombieDeath = (id) => {
    const idx = gameState.zombies.findIndex(z => z.id === id);
    if (idx !== -1) {
        const z = gameState.zombies[idx];
        z.hp = 0; 
        gameState.zombies.splice(idx, 1);
        for (let k = 0; k < 5; k++) gameState.particles.push(new Particle(z.x, z.y, 'purple', 3));
    }
};

networking.onRemoteZombieUpdate = (zombieData) => {
    zombieData.forEach(data => {
        let z = gameState.zombies.find(z => z.id === data.id);
        if (z) {
            z.updateRemote(data.x, data.y, data.hp);
        } else {
            const newZ = new Zombie();
            newZ.id = data.id;
            newZ.setPosition(data.x, data.y);
            newZ.hp = data.hp;
            gameState.zombies.push(newZ);
        }
    });
    const ids = zombieData.map(d => d.id);
    gameState.zombies = gameState.zombies.filter(z => ids.includes(z.id));
};
networking.onRemoteZombieHit = (data) => {
    if (networking.isHost) {
        const z = gameState.zombies.find(z => z.id === data.zombieId);
        if (z) z.hp -= data.damage;
    }
};

networking.onReadyUpdate = (data) => {
    readyList.innerHTML = '';
    data.forEach(p => {
        const div = document.createElement('div');
        div.className = `ready-item ${p.isReady ? 'ready' : ''}`;
        div.innerText = `${p.name}: ${p.isReady ? 'READY' : 'WAITING'}`;
        readyList.appendChild(div);
    });
};

networking.onLeaderboardUpdate = (data) => {
    leaderList.innerHTML = '';
    data.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = `leader-item ${p.isMVP ? 'mvp' : ''}`;
        div.style.padding = '8px';
        div.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.color = p.isMVP ? '#fcd34d' : 'white';
        
        div.innerHTML = `
            <span>${i+1}. ${p.name} ${p.isMVP ? '👑' : ''}</span>
            <span style="font-size: 12px; opacity: 0.8;">${p.kills} KILLS (${p.score})</span>
        `;
        leaderList.appendChild(div);
    });
};

networking.onGameStart = () => {
    console.log("!!! GAME START !!!");
    menuScreen.classList.add('hidden'); 
    gameState.gameStarted = true;
    gameState.active = true;
    audioManager.playBGM(); // Start music
};

networking.onRoomJoined = (code) => {
    console.log("Lobby joined successfully:", code);
    roomDisplay.innerText = code;
    
    // Hide all setup elements
    document.getElementById('setup-menu-content').classList.add('hidden');
    menuScreen.querySelector('h1').classList.add('hidden');
    const pTag = menuScreen.querySelector('p');
    if (pTag) pTag.classList.add('hidden');

    // Show ready section
    readySection.classList.remove('hidden');
    
    document.getElementById('leaderboard').classList.remove('hidden');
    document.getElementById('chat-container').classList.remove('hidden');
    skillsHud.classList.remove('hidden');
};

// Resize Function
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function spawnObject(obj, isLocal = true) {
    if (gameState.active) {
        obj.isLocal = isLocal; 
        gameState.projectiles.push(obj);

        if (isLocal) {
            let settings = null;
            if (obj.constructor.name === 'MalevolentShrineObject') settings = SKILL_SETTINGS.sukuna.shrine;
            if (obj.constructor.name === 'WorldSlash') settings = SKILL_SETTINGS.sukuna.worldSlash;

            networking.sendAction({
                type: obj.constructor.name,
                x: obj.x, y: obj.y, angle: obj.angle,
                settings: settings
            });
        }
    }
}

// --- SETUP CONTROLS ---
function setupGlobalControls() {
    window.addEventListener('keydown', e => {
        if (!gameState.active || !gameState.player || gameState.isSpectating) return;
        const key = e.key.toLowerCase();
        if (key === 'q') { gameState.player.skillQ(); networking.sendAction('skillQ', gameState.player.angle); }
        if (key === 'e') { gameState.player.skillE(); networking.sendAction('skillE', gameState.player.angle); }
        if (key === 'r') { gameState.player.skillR(); networking.sendAction('skillR', gameState.player.angle); }
        if (e.code === 'Space') { gameState.player.skillUlt(); networking.sendAction('skillUlt', gameState.player.angle); }
    });

    window.addEventListener('mousedown', e => {
        if (!gameState.active || !gameState.player || gameState.isSpectating) return;
        if (e.target.closest('.interactive')) return;
        gameState.player.punch();
        networking.sendAction('punch', gameState.player.angle);
    });

    const musicBtn = document.getElementById('music-toggle');
    if (musicBtn) {
        musicBtn.onclick = () => {
            const isMuted = audioManager.toggleMute();
            musicBtn.innerText = `🎵 MUSIC: ${isMuted ? 'OFF' : 'ON'}`;
            musicBtn.style.color = isMuted ? '#666' : '#a855f7';
        };
    }
}
setupGlobalControls();

function updateUI() {
    if (!gameState.player) return;
    scoreDisplay.innerText = gameState.score;
    const waveDisplay = document.getElementById('wave-display');
    if (waveDisplay) waveDisplay.innerText = gameState.wave;
    
    const hpPercent = Math.max(0, (gameState.player.health / gameState.player.maxHealth) * 100);
    healthBar.style.width = `${hpPercent}%`;
}

function animate() {
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!gameState.active) return;

    let camTarget = { x: 0, y: 0 };
    if (!gameState.isSpectating && gameState.player) {
        gameState.player.update(gameState.camera);
        networking.sendMovement(gameState.player.x, gameState.player.y, gameState.player.angle);
        camTarget = { x: gameState.player.x, y: gameState.player.y };
        if (gameState.player.health <= 0) startSpectating();
    } else {
        const alivePlayers = Object.values(networking.remotePlayers).filter(rp => !rp.isDead);
        if (alivePlayers.length > 0) {
            const target = alivePlayers[0];
            camTarget = { x: target.x, y: target.y };
            spectatorTargetName.innerText = target.name.toUpperCase();
        } else if (gameState.player) {
            camTarget = { x: gameState.player.x, y: gameState.player.y };
            spectatorTargetName.innerText = "NO ONE ALIVE";
        }
    }

    // Camera Logic
    gameState.camera.x += (camTarget.x - canvas.width/2 - gameState.camera.x) * 0.1;
    gameState.camera.y += (camTarget.y - canvas.height/2 - gameState.camera.y) * 0.1;
    gameState.camera.x = Math.max(0, Math.min(CONFIG.WORLD_WIDTH - canvas.width, gameState.camera.x));
    gameState.camera.y = Math.max(0, Math.min(CONFIG.WORLD_HEIGHT - canvas.height, gameState.camera.y));

    networking.updateRemotePlayers(gameState.camera);

    // --- ZOMBIE SYNC & WAVE LOGIC ---
    // บังคับให้เกิดซอมบี้ถ้าเป็น Host หรือถ้าเล่นคนเดียวแล้วยังไม่มีซอมบี้
    const shouldSpawn = networking.isHost && gameState.gameStarted;
    
    if (shouldSpawn) {
        gameState.spawnTimer++;
        
        // Difficulty scaling based on wave
        const maxZombies = 5 + (gameState.wave * 3);
        const spawnInterval = Math.max(30, CONFIG.SPAWN_RATE - (gameState.wave * 10));

        if (gameState.spawnTimer > spawnInterval && gameState.zombies.length < maxZombies) {
            const spawnPoint = level.getRandomSpawnPoint();
            const z = new Zombie(gameState.player);
            
            // Scaled health and speed
            z.hp = 100 + (gameState.wave - 1) * 25;
            z.speed = 1.5 + (gameState.wave * 0.1);
            
            z.setPosition(spawnPoint.x, spawnPoint.y);
            gameState.zombies.push(z);
            networking.sendZombieSpawn({ id: z.id, x: z.x, y: z.y, speed: z.speed });
            gameState.spawnTimer = 0;
        }

        const syncData = [];
        gameState.zombies.forEach((z) => {
            const allPlayers = [gameState.player, ...Object.values(networking.remotePlayers).filter(rp => !rp.isDead)];
            let closest = null, minDist = Infinity;
            allPlayers.forEach(p => {
                if (!p) return;
                const d = Math.hypot(z.x - p.x, z.y - p.y);
                if (d < minDist) { minDist = d; closest = p; }
            });
            z.update(closest || gameState.player, networking.isHost);
            
            allPlayers.forEach(p => {
                if (p && !p.isDead && Math.hypot(z.x - p.x, z.y - p.y) < z.radius + p.radius) {
                    if (p === gameState.player) {
                        p.health -= 0.5;
                        networking.sendHealthUpdate(p.health);
                    }
                }
            });

            if (z.dead) {
                networking.sendZombieDeath(z.id);
                // Spawn Drop (20% chance)
                if (Math.random() < 0.2) gameState.drops.push(new DropItem(z.x, z.y));

                gameState.score += 10;
                gameState.killedInWave++;
                
                // Advance Wave logic
                if (gameState.killedInWave >= (gameState.wave * 5)) {
                    gameState.wave++;
                    gameState.killedInWave = 0;
                    console.log("!!! WAVE CLEAR !!! NEXT WAVE:", gameState.wave);
                }
            } else {
                syncData.push({ id: z.id, x: z.x, y: z.y, hp: z.hp });
            }
        });
        
        // CLEANUP ARRAYS (Bug Fix: Do not splice during forEach)
        gameState.zombies = gameState.zombies.filter(z => !z.dead);
        networking.sendZombieUpdate(syncData);
    }

    gameState.projectiles.forEach((proj) => {
        proj.update(gameState.zombies, gameState.particles, proj.isLocal ? networking : null);
    });
    gameState.projectiles = gameState.projectiles.filter(p => !p.dead);

    gameState.particles.forEach((pt) => pt.update());
    gameState.particles = gameState.particles.filter(p => !p.dead);

    gameState.drops.forEach((drop) => drop.update(gameState.player));
    gameState.drops = gameState.drops.filter(d => !d.dead);

    updateUI();

    ctx.save();
    ctx.translate(-gameState.camera.x, -gameState.camera.y);
    level.draw(ctx); // This now draws Portals too!
    ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
    gameState.drops.forEach(drop => drop.draw(ctx));
    gameState.projectiles.forEach(proj => proj.draw(ctx));
    gameState.particles.forEach(pt => pt.draw(ctx));
    gameState.zombies.forEach(z => z.draw(ctx));
    if (gameState.player) gameState.player.draw(ctx);
    networking.drawRemotePlayers(ctx);
    ctx.restore();
}

function startSpectating() {
    gameState.isSpectating = true;
    if (gameState.player) gameState.player.isDead = true;
    spectatorOverlay.classList.remove('hidden');
    networking.sendDeath();
}

// --- BUTTONS ---
const initJoin = (roomCode) => {
    joinRoomBtn.disabled = true;
    createRoomBtn.disabled = true;
    joinRoomBtn.style.opacity = "0.5";
    createRoomBtn.style.opacity = "0.5";

    const playerName = document.getElementById('player-name').value || 'Sorcerer';
    const charType = window.selectedCharType || 'gojo';
    
    // ✅ แก้ลำดับเป็น x, y, type
    gameState.player = new Player(1200, 1200, charType);
    gameState.player.spawnObjectCallback = spawnObject; 
    gameState.player.name = playerName;

    networking.connect({
        roomCode, name: playerName, type: charType,
        x: gameState.player.x, y: gameState.player.y,
        angle: gameState.player.angle,
        health: gameState.player.health, maxHealth: gameState.player.maxHealth
    });
};

joinRoomBtn.onclick = () => {
    const code = roomInput.value.trim().toUpperCase();
    if (!code) { alert("PLEASE ENTER A ROOM CODE"); return; }
    initJoin(code);
};

createRoomBtn.onclick = () => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    initJoin(code);
};

readyBtn.onclick = () => {
    gameState.isReady = !gameState.isReady;
    readyBtn.innerText = gameState.isReady ? "I AM READY (✔)" : "I AM READY";
    readyBtn.classList.toggle('active', gameState.isReady);
    networking.sendReady(gameState.isReady);
};

// Chat & Score
setInterval(() => {
    if (gameState.active && gameState.player && gameState._lastScore !== gameState.score) {
        networking.sendScore(gameState.score);
        gameState._lastScore = gameState.score;
    }
}, 1000);

document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
        networking.sendChatMessage(e.target.value.trim());
        e.target.value = ''; e.target.blur();
    }
});

animate();