// src/main.js
console.log("[SYSTEM] JJK World Main Script Loading...");
import { CONFIG, SKILL_SETTINGS } from './config.js';
import { input } from './core/Input.js';
import { Gojo } from './entities/characters/Gojo.js';
import { Sukuna } from './entities/characters/Sukuna.js';
import { Toji } from './entities/characters/Toji.js';
import { Yuta } from './entities/characters/Yuta.js';
import { RemotePlayer } from './entities/RemotePlayer.js';
import { Zombie } from './entities/Zombie.js';
import { BossZombie } from './entities/BossZombie.js';
import { DropItem } from './entities/Drops.js';
import { Level } from './core/Level.js';
import { Networking } from './core/Networking.js';
import { AudioManager } from './core/AudioManager.js';
import { UIManager } from './core/UIManager.js';
import { DamageNumber } from './skills/BaseSkills.js';
import * as SkillObjects from './entities/SkillObjects.js';

console.log("[SYSTEM] All modules imported successfully.");

// --- Early Window Exposure (Handled at bottom) ---


let ui, networking, audio, level, canvas, ctx;
const shake = { duration: 0, intensity: 0 };
window.selectedCharType = 'gojo'; // Default selection
window.selectedMode = 'pve';
const gameState = {
    active: false,
    gameStarted: false,
    player: null,
    zombies: [],
    projectiles: [],
    particles: [],
    drops: [],
    damageNumbers: [],
    score: 0,
    wave: 1,
    killedInWave: 0,
    spawnTimer: 0,
    camera: { x: 0, y: 0 },
    isReady: false,
    isSpectating: false,
    bossActive: false,
    mode: 'pve'
};

try {
    console.log("[SYSTEM] Initializing Canvas...");
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    console.log("[SYSTEM] Initializing Core Objects...");
    level = new Level();
    audio = new AudioManager();
    window.gameAudio = audio;
    if (window.pendingBGMStart) audio.playBGM();

    console.log("[SYSTEM] Initializing UI and Networking...");
    ui = new UIManager(gameState);
    networking = new Networking(gameState, RemotePlayer, spawnRemoteObject);
    window.networking = networking;
    
    setupLobbyListeners();
    console.log("[SYSTEM] Startup Complete.");
} catch (err) {
    console.error("[SYSTEM] FATAL CRASH DURING INIT:", err);
}

// Setup Networking callbacks
networking.onChat = (name, msg) => ui.addChatMessage(name, msg);
networking.onLeaderboard = (list) => ui.updateLeaderboard(list);
networking.onRemoteProjectileSpawn = (data) => {
    const { type, x, y, angle, settings, ownerId } = data;
    const SkillClass = SkillObjects[type];
    if (SkillClass) {
        // Find owner (could be local player if reflected, or remote player)
        let owner = null;
        if (ownerId === networking.socket?.id) owner = gameState.player;
        else owner = networking.remotePlayers[ownerId];

        // Normalize constructor: (x, y, angle, settings, ownerId)
        const obj = new SkillClass(x, y, angle, settings, ownerId);
        if (owner) obj.owner = owner; 
        obj.isLocal = false;
        gameState.projectiles.push(obj);
    }
};

networking.onNewHost = (hostId) => {
    const isMe = (hostId === networking.socket?.id);
    ui.addChatMessage("SYSTEM", isMe ? "👑 YOU ARE THE NEW HOST!" : "👑 A NEW HOST HAS BEEN ASSIGNED.");
    if (isMe) triggerShake(5, 10);
};

// ─── PVP Networking Callbacks ─────────────────────────────────────────────────────
networking.onRoomMode = (mode) => {
    gameState.mode = mode;
    ui.setMode(mode);
};

networking.onSyncWave = (wave) => {
    if (wave > gameState.wave) {
        gameState.wave = wave;
        ui.addChatMessage("SYSTEM", `🌊 WAVE SYNCED: ${wave}`);
    }
    gameState.wave = wave;
};

networking.onSyncScore = (score) => {
    if (score > gameState.score) gameState.score = score;
};

networking.onPvpKill = (data) => {
    ui.showKillFeed(data.killerName, data.victimName, data.killerId === networking.socket?.id);
    // Local player gets kill credit text
    if (data.killerId === networking.socket?.id) {
        ui.showKillFeedLocal(`⚔️ YOU ELIMINATED ${data.victimName}! (${data.killerKills}/5)`);
        triggerShake(10, 15);
    }
    // If local player was killed
    if (data.victimId === networking.socket?.id) {
        triggerShake(15, 20);
        gameState.isSpectating = true;
    }
};

networking.onPvpScoreUpdate = (scores) => {
    ui.updatePvpScores(scores);
};

networking.onPvpRoundStart = (data) => {
    gameState.isSpectating = false;
    // Reset local player position and HP from server data
    const myData = data.players.find(p => p.id === networking.socket?.id);
    if (myData && gameState.player) {
        gameState.player.x = myData.x;
        gameState.player.y = myData.y;
        gameState.player.health = myData.health;
        gameState.player.isDead = false;
    }
    // Reset remote players
    data.players.forEach(p => {
        if (networking.remotePlayers[p.id]) {
            networking.remotePlayers[p.id].x = p.x;
            networking.remotePlayers[p.id].y = p.y;
            networking.remotePlayers[p.id].targetX = p.x;
            networking.remotePlayers[p.id].targetY = p.y;
            networking.remotePlayers[p.id].health = p.health;
            networking.remotePlayers[p.id].isDead = false;
        }
    });
    ui.showPvpRoundStart(data.round, data.killsToWin);
    ui.updatePvpScores(data.scores);
};

networking.onPvpRoundEnd = (data) => {
    ui.showPvpRoundEnd(data.winnerName, data.round, data.scores);
};


// NEW: ตัวรับคำสั่งเริ่มเกมจาก Server
networking.onGameStart = () => {
    console.log("[SYSTEM] Game starting! Hiding lobby menu...");
    gameState.active = true;
    gameState.gameStarted = true;
    document.getElementById('setup-menu')?.classList.add('hidden');
    if (audio) audio.playBGM();
};

// NEW: เมื่อเข้าห้องสำเร็จ ให้เปิดหน้า Lobby
networking.onRoomJoined = (code) => {
    console.log("[LOBBY] Room joined successfully:", code);
    document.getElementById('setup-menu-content')?.classList.add('hidden');
    document.getElementById('ready-section')?.classList.remove('hidden');
    document.getElementById('room-display').innerText = code;
};

// --- Verbose Lobby Initialization ---
function setupLobbyListeners() {
    console.log("[LOBBY] Setting up listeners...");
    
    const createBtn = document.getElementById('create-room-btn');
    if (createBtn) {
        console.log("[LOBBY] Found Create Button, attaching listener...");
        createBtn.addEventListener('click', () => {
            console.log("[LOBBY] Create button CLICKED!");
            const code = Math.random().toString(36).substring(2, 6).toUpperCase();
            if (window.gameAudio) window.gameAudio.playBGM();
            initJoin(code);
        });
    } else {
        console.error("[LOBBY] Create Button NOT FOUND in DOM!");
    }

    const joinBtn = document.getElementById('join-room-btn');
    if (joinBtn) {
        console.log("[LOBBY] Found Join Button, attaching listener...");
        joinBtn.addEventListener('click', () => {
            console.log("[LOBBY] Join button CLICKED!");
            const code = document.getElementById('room-input')?.value.trim().toUpperCase();
            if (code) {
                if (window.gameAudio) window.gameAudio.playBGM();
                initJoin(code);
            } else {
                console.warn("[LOBBY] No room code entered!");
            }
        });
    } else {
        console.error("[LOBBY] Join Button NOT FOUND in DOM!");
    }

    const readyBtn = document.getElementById('ready-btn');
    if (readyBtn) {
        readyBtn.addEventListener('click', () => {
            console.log("[LOBBY] Ready button CLICKED!");
            gameState.isReady = !gameState.isReady;
            readyBtn.innerText = gameState.isReady ? "I AM READY (✔)" : "I AM READY";
            if (networking) networking.sendReady(gameState.isReady);
        });
    }
}

// NEW: อัปเดตรายชื่อคนในห้องและสถานะ Ready
networking.onReadyUpdate = (players) => {
    const list = document.getElementById('ready-list');
    if (!list) return;
    list.innerHTML = Object.values(players).map(p => `
        <div class="ready-item ${p.isReady ? 'ready' : ''}">
            ${p.name} ${p.isReady ? '✔' : ''}
        </div>
    `).join('');
};

// NEW: ตัวรับข้อมูลซอมบี้จาก Host (สำหรับเครื่องคนจอย)
networking.onRemoteZombieSpawn = (zData) => {
    let z;
    if (zData.isBoss) {
        z = new BossZombie(gameState.player, zData.id, zData.wave);
    } else {
        z = new Zombie(gameState.player, zData.id);
    }
    z.setPosition(zData.x, zData.y);
    z.speed = zData.speed;
    // Sync HP for both boss and normal zombies
    if (zData.maxHp) { z.maxHp = zData.maxHp; z.hp = zData.maxHp; }
    if (zData.hp && zData.hp !== zData.maxHp) z.hp = zData.hp;
    gameState.zombies.push(z);
};

networking.onRemoteZombieUpdate = (zList) => {
    zList.forEach(data => {
        const z = gameState.zombies.find(zm => zm.id === data.id);
        if (z) z.updateRemote(data.x, data.y, data.hp);
    });
};

networking.onRemoteZombieDeath = (id) => {
    const z = gameState.zombies.find(zm => zm.id === id);
    if (z) {
        z.dead = true;
        if (gameState.player) {
            if (gameState.player.type === 'yuta' && typeof gameState.player.addRika === 'function') gameState.player.addRika(5);
            if (gameState.player.type === 'toji' && typeof gameState.player.addBloodlust === 'function') gameState.player.addBloodlust();
            if (gameState.player.type === 'sukuna' && typeof gameState.player.addShrine === 'function') gameState.player.addShrine(20);
        }
    }
};

networking.onRemoteZombieHit = (data) => {
    const z = gameState.zombies.find(zm => zm.id === data.zombieId);
    if (z) z.hp -= data.damage;
};

// ─── Spawn Helpers ───────────────────────────────────────────────────────────
// spawnObject: สร้าง projectile สำหรับผู้เล่น local และ broadcast ไปยัง server
function spawnObject(obj, isLocal = true) {
    if (!obj) return;
    obj.isLocal = isLocal;
    gameState.projectiles.push(obj);
    if (isLocal) {
        networking.sendProjectileSpawn({
            type: obj.constructor.name,
            x: obj.x, y: obj.y,
            angle: obj.angle || 0,
            settings: obj.settings || {},
            ownerId: networking.socket?.id
        });
    }
}

// spawnRemoteObject: สร้าง projectile ที่ได้รับจาก remote player (ไม่ broadcast)
function spawnRemoteObject(obj) {
    spawnObject(obj, false);
}
// ─────────────────────────────────────────────────────────────────────────────


window.triggerShake = function(duration, intensity) {
    shake.duration = duration;
    shake.intensity = intensity;
};

function animate() {
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!gameState.active) return;

    let camTarget = { x: 0, y: 0 };
    if (!gameState.isSpectating && gameState.player) {
        gameState.player.update();
        networking.sendMovement(gameState.player.x, gameState.player.y, gameState.player.angle);
        camTarget = { x: gameState.player.x, y: gameState.player.y };
        
        // NEW: ตรวจสอบความตายจากค่าที่เซิร์ฟเวอร์ส่งมา (ผ่าน p.health)
        if (gameState.player.health <= 0) startSpectating();
    } else {
        const alivePlayers = Object.values(networking.remotePlayers).filter(rp => !rp.isDead);
        if (alivePlayers.length > 0) {
            const target = alivePlayers[0];
            camTarget = { x: target.x, y: target.y };
            ui.showSpectator(target.name);
        } else if (gameState.player) {
            camTarget = { x: gameState.player.x, y: gameState.player.y };
            ui.showSpectator("NO ONE ALIVE");
        }
    }

    // Camera Logic
    gameState.camera.x += (camTarget.x - canvas.width/2 - gameState.camera.x) * 0.1;
    gameState.camera.y += (camTarget.y - canvas.height/2 - gameState.camera.y) * 0.1;
    gameState.camera.x = Math.max(0, Math.min(CONFIG.WORLD_WIDTH - canvas.width, gameState.camera.x));
    gameState.camera.y = Math.max(0, Math.min(CONFIG.WORLD_HEIGHT - canvas.height, gameState.camera.y));

    // Update global mouse world position for skills
    if (input && input.mouse) {
        input.mouse.worldX = gameState.camera.x + input.mouse.x;
        input.mouse.worldY = gameState.camera.y + input.mouse.y;
    }

    // Game Logic (Only Host or Solo handles spawning and authoritative AI)
    // Skip zombie spawning in PVP mode
    if (gameState.mode === 'pve') {
      if (networking.isHost || Object.keys(networking.remotePlayers).length === 0) {
        gameState.spawnTimer++;
        if (gameState.wave % 10 === 0) {
            if (!gameState.bossActive && gameState.zombies.length === 0) {
                gameState.bossActive = true;
                const bossTarget = gameState.player || Object.values(networking.remotePlayers)[0];
                const z = new BossZombie(bossTarget, null, gameState.wave);
                const spawnPoint = level.getRandomSpawnPoint();
                z.setPosition(spawnPoint.x, spawnPoint.y);
                gameState.zombies.push(z);
                networking.sendZombieSpawn({ id: z.id, x: z.x, y: z.y, speed: z.speed, hp: z.hp, maxHp: z.maxHp, isBoss: true, wave: gameState.wave });
                ui.addChatMessage("SYSTEM", `⚠️ WARNING! WAVE ${gameState.wave} BOSS HAS APPEARED! ⚠️`);
            }
        } else {
            const scaledRate = Math.max(30, CONFIG.SPAWN_RATE - (gameState.wave * 3));
            if (gameState.spawnTimer > scaledRate && gameState.zombies.length < 50 && !gameState.bossActive) {
                const spawnTarget = gameState.player || Object.values(networking.remotePlayers)[0];
                const z = new Zombie(spawnTarget);
                const spawnPoint = level.getRandomSpawnPoint();
                z.maxHp = 100 + (gameState.wave - 1) * 25;
                z.hp = z.maxHp;
                z.speed = 1.5 + (gameState.wave * 0.1);
                z.setPosition(spawnPoint.x, spawnPoint.y);
                gameState.zombies.push(z);
                networking.sendZombieSpawn({ id: z.id, x: z.x, y: z.y, speed: z.speed, hp: z.hp, maxHp: z.maxHp, isBoss: false });
                gameState.spawnTimer = 0;
            }
        }
      }
    }

    // ─── PVP Hit Detection ────────────────────────────────────────────────────────
    if (gameState.mode === 'pvp' && !gameState.isSpectating && gameState.player) {
        gameState.projectiles.forEach(proj => {
            if (!proj.isLocal || proj.dead) return; // Only local projectiles can hit others
            Object.values(networking.remotePlayers).forEach(rp => {
                if (rp.isDead) return;
                const dist = Math.hypot(proj.x - rp.x, proj.y - rp.y);
                const hitRadius = (proj.radius || 20) + rp.radius;
                if (dist < hitRadius && !proj._pvpHitIds) proj._pvpHitIds = new Set();
                if (dist < hitRadius && !proj._pvpHitIds.has(rp.id)) {
                    proj._pvpHitIds.add(rp.id);
                    const dmg = proj.damage || 20;
                    networking.sendPvpDamage(rp.id, dmg);
                    // Show damage number locally
                    gameState.damageNumbers.push(new DamageNumber(rp.x, rp.y - 20, dmg, dmg >= 80, '#f87171'));
                    if (window.triggerShake) triggerShake(4, 5);
                    proj.dead = true; // projectile dies on player hit
                }
            });
        });
    }


    // --- Zombie Logic (Runs for EVERYONE) ---
    const syncData = [];
    gameState.zombies.forEach((z) => {
        // 1. Update Position (Interpolation for clients, AI for Host)
        let targetPlayer = null;
        if (networking.isHost || Object.keys(networking.remotePlayers).length === 0) {
            // Host finds closest player for AI
            const allPlayers = [];
            if (gameState.player && !gameState.player.isDead) allPlayers.push(gameState.player);
            Object.values(networking.remotePlayers).forEach(rp => {
                if (!rp.isDead) allPlayers.push(rp);
            });

            let minDist = Infinity;
            allPlayers.forEach(p => {
                const d = Math.hypot(z.x - p.x, z.y - p.y);
                if (d < minDist) { minDist = d; targetPlayer = p; }
            });
        }
        
        z.update(targetPlayer || gameState.player, networking.isHost, gameState, networking);
        
        // 2. Hit Detection (Each player detects for THEMSELVES)
        if (gameState.player && !gameState.player.isDead) {
            const dist = Math.hypot(z.x - gameState.player.x, z.y - gameState.player.y);
            if (dist < z.radius + gameState.player.radius) {
                if (!gameState.player.lastHitTime || Date.now() - gameState.player.lastHitTime > 200) {
                    const dmgTaken = 10;
                    networking.sendDamage(dmgTaken);
                    gameState.player.lastHitTime = Date.now();
                    // Screen shake when player is hit
                    triggerShake(5, 8);

                    // SUKUNA PASSIVE: Reflect 20% damage back to the zombie
                    if (gameState.player.type === 'sukuna') {
                        const reflectDmg = dmgTaken * 0.2;
                        z.hp -= reflectDmg;
                        networking.sendZombieHit(z.id, reflectDmg);
                    }
                }
            }
        }

        // 3. Death handling (Shared and Host-specific)
        if (z.dead) {
            // --- SHARED EFFECTS (Everyone runs this) ---
            if (Math.random() < 0.2) {
                gameState.drops.push(new DropItem(z.x, z.y, Math.random() < 0.3 ? 'heal' : 'energy'));
            }
            
            // Passive gauge gains on kill (Local Player only)
            if (gameState.player && !z.id.includes('dummy')) {
                if (gameState.player.type === 'yuta' && typeof gameState.player.addRika === 'function') gameState.player.addRika(5);
                if (gameState.player.type === 'toji' && typeof gameState.player.addBloodlust === 'function') gameState.player.addBloodlust();
                if (gameState.player.type === 'sukuna' && typeof gameState.player.addShrine === 'function') gameState.player.addShrine(20);
            }

            // --- HOST ONLY (Network authority) ---
            if (networking.isHost || Object.keys(networking.remotePlayers).length === 0) {
                const points = (10 + (gameState.wave * 2)) * (z.isBoss ? 10 : 1);
                networking.sendZombieDeath(z.id, points);
                gameState.score += points;

                if (z.isBoss) {
                    gameState.bossActive = false;
                    gameState.wave++;
                    gameState.killedInWave = 0;
                    ui.addChatMessage("SYSTEM", `🎉 BOSS DEFEATED! WAVE ${gameState.wave - 1} CLEARED! 🎉`);
                    ui.showBossClear(gameState.wave - 1);
                    networking.sendWave(gameState.wave);
                } else {
                    if (gameState.wave % 10 !== 0) {
                        gameState.killedInWave++;
                        if (gameState.killedInWave >= (gameState.wave * 5)) {
                            const clearedWave = gameState.wave;
                            gameState.wave++;
                            gameState.killedInWave = 0;
                            ui.addChatMessage("SYSTEM", `🌊 WAVE ${gameState.wave} BEGINS!`);
                            ui.showWaveClear(clearedWave, gameState.wave);
                            networking.sendWave(gameState.wave);
                        }
                    }
                }
            }
        } else {
            // 4. Host-only sync
            if (networking.isHost || Object.keys(networking.remotePlayers).length === 0) {
                syncData.push({ id: z.id, x: z.x, y: z.y, hp: z.hp });
            }
        }
    });

    // Cleanup dead zombies
    if (networking.isHost || Object.keys(networking.remotePlayers).length === 0) {
        gameState.zombies = gameState.zombies.filter(z => !z.dead);
        if (gameState.spawnTimer % 3 === 0) networking.sendZombieUpdate(syncData);
    } else {
        gameState.zombies = gameState.zombies.filter(z => !z.dead);
    }

    // Updates
    gameState.projectiles.forEach(p => p.update(gameState.zombies, gameState.particles, p.isLocal ? networking : null, gameState.damageNumbers));
    gameState.projectiles = gameState.projectiles.filter(p => !p.dead);
    gameState.particles.forEach(p => p.update());
    gameState.particles = gameState.particles.filter(p => !p.dead);
    gameState.damageNumbers.forEach(d => d.update());
    gameState.damageNumbers = gameState.damageNumbers.filter(d => !d.dead);
    gameState.drops.forEach(d => d.update(gameState.player, gameState.damageNumbers));
    gameState.drops = gameState.drops.filter(d => !d.dead);

    ui.updateUI();

    // ─── Screen Shake ────────────────────────────────────────────────────────
    let shakeX = 0, shakeY = 0;
    if (shake.duration > 0) {
        shake.duration--;
        shakeX = (Math.random() - 0.5) * shake.intensity * 2;
        shakeY = (Math.random() - 0.5) * shake.intensity * 2;
        shake.intensity *= 0.88; // decay
        if (shake.intensity < 0.3) { shake.intensity = 0; shake.duration = 0; }
    }

    // Render
    ctx.save();
    ctx.translate(-gameState.camera.x + shakeX, -gameState.camera.y + shakeY);
    level.draw(ctx);
    ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
    gameState.drops.forEach(d => d.draw(ctx));
    gameState.projectiles.forEach(p => p.draw(ctx));
    gameState.particles.forEach(p => p.draw(ctx));
    gameState.zombies.forEach(z => z.draw(ctx));
    if (gameState.player) gameState.player.draw(ctx);
    networking.drawRemotePlayers(ctx);
    // Damage numbers drawn in world space
    gameState.damageNumbers.forEach(d => d.draw(ctx));
    ctx.restore();
}

function startSpectating() {
    gameState.isSpectating = true;
    if (gameState.player) gameState.player.isDead = true;
    networking.sendDeath();
}

// --- Interaction ---
window.addEventListener('mousedown', (e) => {
    if (gameState.active && gameState.player && !gameState.isSpectating) {
        if (e.button === 0) {
            gameState.player.punch();
            networking.sendAction('punch', gameState.player.angle);
        }
    }
});

window.addEventListener('keydown', (e) => {
    if (gameState.active && gameState.player && !gameState.isSpectating) {
        const key = e.key.toLowerCase();
        if (key === 'q') {
            if (typeof gameState.player.holdQ === 'function') gameState.player.holdQ(true);
            else gameState.player.skillQ();
            networking.sendAction('skillQ', gameState.player.angle);
        }
        if (key === 'e') {
            gameState.player.skillE();
            networking.sendAction('skillE', gameState.player.angle);
        }
        if (key === 'r') {
            gameState.player.skillR();
            networking.sendAction('skillR', gameState.player.angle);
        }
        if (key === ' ') {
            gameState.player.skillUlt();
            networking.sendAction('skillUlt', gameState.player.angle);
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (gameState.active && gameState.player && !gameState.isSpectating) {
        const key = e.key.toLowerCase();
        if (key === 'q' && typeof gameState.player.holdQ === 'function') {
            gameState.player.holdQ(false);
        }
        if (key === 'e' && typeof gameState.player.releaseE === 'function') {
            gameState.player.releaseE();
        }
    }
});

// UI Buttons
document.getElementById('music-toggle').onclick = () => {
    const isMuted = audio.toggleMute();
    document.getElementById('music-toggle').innerText = isMuted ? "🎵 MUSIC: OFF" : "🎵 MUSIC: ON";
};

document.getElementById('bgm-vol-down').onclick = () => {
    audio.setBGMVolume(audio.bgmVolume - 10);
};

document.getElementById('bgm-vol-up').onclick = () => {
    audio.setBGMVolume(audio.bgmVolume + 10);
};

document.getElementById('sfx-vol-down').onclick = () => {
    audio.setSFXVolume(audio.sfxVolume - 10);
};

document.getElementById('sfx-vol-up').onclick = () => {
    audio.setSFXVolume(audio.sfxVolume + 10);
};

// --- initJoin Implementation ---
function initJoin(roomCode) {
    console.log("[LOBBY] initJoin starting for room:", roomCode);
    const playerName = document.getElementById('player-name')?.value || 'Sorcerer';
    const charType = window.selectedCharType || 'gojo';
    const mode = window.selectedMode || 'pve';
    console.log("[LOBBY] Final Player Config:", { playerName, charType, mode, roomCode });
    
    // UI Transition: Hide selection, show ready section
    document.getElementById('setup-menu-content')?.classList.add('hidden');
    document.getElementById('ready-section')?.classList.remove('hidden');
    document.getElementById('room-display').innerText = roomCode;

    // Toggle specific HUDs
    const charHuds = ['six-eyes-hud', 'rika-gauge-container', 'sukuna-domain-container', 'toji-hold-container'];
    charHuds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    try {
        if (charType === 'gojo') {
            gameState.player = new Gojo(1200, 1200, audio);
            document.getElementById('six-eyes-hud')?.classList.remove('hidden');
        } else if (charType === 'sukuna') {
            gameState.player = new Sukuna(1200, 1200, audio);
            document.getElementById('sukuna-domain-container')?.classList.remove('hidden');
        } else if (charType === 'toji') {
            gameState.player = new Toji(1200, 1200, audio);
            document.getElementById('toji-hold-container')?.classList.remove('hidden');
        } else if (charType === 'yuta') {
            gameState.player = new Yuta(1200, 1200, audio);
            document.getElementById('rika-gauge-container')?.classList.remove('hidden');
        } else {
            gameState.player = new Gojo(1200, 1200, audio);
        }
    } catch (err) {
        console.error("[LOBBY] Error creating player object:", err);
    }
    
    if (ui) ui.updateSkillIcons(charType);
    if (gameState.player) {
        gameState.player.spawnObjectCallback = spawnObject; 
        gameState.player.name = playerName;
    }

    if (networking) {
        console.log("[LOBBY] Calling networking.connect with roomCode:", roomCode);
        networking.connect({
            roomCode, name: playerName, type: charType,
            x: gameState.player?.x || 1200, y: gameState.player?.y || 1200,
            angle: gameState.player?.angle || 0,
            health: gameState.player?.health || 1200, maxHealth: gameState.player?.maxHealth || 1200,
            mode
        });
    } else {
        console.error("[LOBBY] Networking object is null during initJoin!");
    }
}

// Global: Select character from HTML
window.selectChar = function(type) {
    const charCards = document.querySelectorAll('.char-card');
    charCards.forEach(card => {
        card.classList.remove('selected');
        if (card.id === `card-${type}` || card.dataset.char === type) {
            card.classList.add('selected');
        }
    });
    window.selectedCharType = type;
    console.log("[LOBBY] Character selected:", type);
};

// Global: Select game mode from HTML buttons
window.selectMode = function(mode) {
    window.selectedMode = mode;
    const pvpBtn = document.getElementById('mode-pvp');
    const pveBtn = document.getElementById('mode-pve');
    if (!pvpBtn || !pveBtn) return;
    if (mode === 'pvp') {
        pvpBtn.classList.add('active-pvp');
        pveBtn.classList.remove('active-pve');
    } else {
        pveBtn.classList.add('active-pve');
        pvpBtn.classList.remove('active-pvp');
    }
};

animate();

document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
        networking.sendChatMessage(e.target.value.trim());
        e.target.value = ''; e.target.blur();
    }
});

console.log("[SYSTEM] JJK World Main Script Loaded Fully.");