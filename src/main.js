import { CONFIG, SKILL_SETTINGS } from './config.js';
import { input } from './core/Input.js';
// เข้าไปในโฟลเดอร์ entities
import { Player } from './entities/Player.js';
import { Zombie } from './entities/Zombie.js';
import { Particle } from './entities/SkillObjects.js';
import { Level } from './core/Level.js';

console.log("Game Script Loaded! (Modular Structure Correct!)");

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score-display');
const healthBar = document.getElementById('health-bar');
const startBtn = document.getElementById('start-btn');
const menuScreen = document.getElementById('menu-screen');
const skillsHud = document.getElementById('skills-hud');

// ✅ สร้าง Instance ของ Level
const level = new Level();

// Game State
let gameState = {
    active: false,
    score: 0,
    spawnTimer: 0,
    camera: { x: 0, y: 0 },
    player: null,
    zombies: [],
    projectiles: [],
    particles: []
};

// Resize Function
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Callback
function spawnObject(obj) {
    if (gameState.active) gameState.projectiles.push(obj);
}

// --- SETUP CONTROLS ---
function setupGlobalControls() {
    // 1. Keyboard (PC)
    window.addEventListener('keydown', e => {
        if (!gameState.active || !gameState.player) return;
        const key = e.key.toLowerCase();
        if (key === 'q') gameState.player.skillQ();
        if (key === 'e') gameState.player.skillE();
        if (key === 'r') gameState.player.skillR();
        if (e.code === 'Space') gameState.player.skillUlt();
    });

    // 2. Mouse Attack
    window.addEventListener('mousedown', e => {
        if (!gameState.active || !gameState.player) return;
        if (e.target.closest('.mobile-btn') || e.target.closest('#joystick-zone') || e.target.closest('.interactive')) {
            return;
        }
        gameState.player.punch();
    });

    // 3. Mobile Buttons Binding
    const bindButton = (id, action) => {
        const btn = document.getElementById(id);
        if (!btn) return;

        const trigger = (e) => {
            e.preventDefault();
            if (gameState.active && gameState.player) {
                action();
                btn.style.transform = "scale(0.9)";
                setTimeout(() => btn.style.transform = "scale(1)", 100);
            }
        };

        btn.addEventListener('touchstart', trigger, { passive: false });
        btn.addEventListener('mousedown', trigger);
    };

    bindButton('btn-punch', () => gameState.player.punch());
    bindButton('btn-q', () => gameState.player.skillQ());
    bindButton('btn-e', () => gameState.player.skillE());
    bindButton('btn-r', () => gameState.player.skillR());
    bindButton('btn-space', () => gameState.player.skillUlt());
}

setupGlobalControls();

// --- GAME LOOP ---
function updateUI() {
    if (!gameState.player) return;

    scoreDisplay.innerText = gameState.score;
    const hpPercent = Math.max(0, (gameState.player.health / gameState.player.maxHealth) * 100);
    healthBar.style.width = `${hpPercent}%`;

    const setCD = (id, cur, max) => {
        const el = document.getElementById(id);
        if (el) el.style.height = `${(cur / max) * 100}%`;
    };

    const s = gameState.player.stats.cd;
    const c = gameState.player.cd;
    setCD('cd-q', c.q, s.q);
    setCD('cd-e', c.e, s.e);
    setCD('cd-r', c.r, s.r);
    setCD('cd-space', c.space, s.space);
}

function animate() {
    requestAnimationFrame(animate);

    // Clear background
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!gameState.active || !gameState.player) return;

    const p = gameState.player;
    p.update(gameState.camera);

    // Camera Logic
    gameState.camera.x = p.x - canvas.width / 2;
    gameState.camera.y = p.y - canvas.height / 2;
    gameState.camera.x = Math.max(0, Math.min(CONFIG.WORLD_WIDTH - canvas.width, gameState.camera.x));
    gameState.camera.y = Math.max(0, Math.min(CONFIG.WORLD_HEIGHT - canvas.height, gameState.camera.y));

    // Zombie Spawning
    gameState.spawnTimer++; // ต้องเพิ่มตัวนับเวลาด้วยครับ ไม่งั้นไม่เกิด
    if (gameState.spawnTimer > CONFIG.SPAWN_RATE) {
        const z = new Zombie(p);

        // ✅ ใช้ฟังก์ชันสุ่มจุดเกิดจาก Level
        const spawnPoint = level.getRandomSpawnPoint();
        z.setPosition(spawnPoint.x, spawnPoint.y);

        gameState.zombies.push(z);
        gameState.spawnTimer = 0;
    }

    // Update Zombies
    gameState.zombies.forEach((z, i) => {
        z.update(p);
        if (Math.hypot(z.x - p.x, z.y - p.y) < z.radius + p.radius) {
            p.health -= 0.5;
            if (p.health <= 0) gameOver();
        }
        if (z.dead) {
            gameState.zombies.splice(i, 1);
            gameState.score += 10;
            for (let k = 0; k < 5; k++) gameState.particles.push(new Particle(z.x, z.y, 'purple', 3));
        }
    });

    // Update Projectiles
    gameState.projectiles.forEach((proj, i) => {
        if (proj.update.length > 0) proj.update(gameState.zombies, gameState.particles);
        else proj.update();

        // Projectile Collision Logic
        // เช็คว่า proj มีค่า damage หรือไม่ (บางอันเป็น visual)
        if (!proj.dead && (proj.damage !== undefined && proj.damage > 0)) {
            gameState.zombies.forEach(z => {
                // เช็คระยะชน (ถ้า proj ไม่มี radius ให้ใช้ค่า default 20)
                if (Math.hypot(proj.x - z.x, proj.y - z.y) < (proj.radius || 20) + z.radius) {
                    // หักเลือดซอมบี้
                    z.hp -= proj.damage;

                    // ผลักซอมบี้ถอยหลังนิดหน่อย
                    const ang = Math.atan2(z.y - p.y, z.x - p.x);
                    z.x += Math.cos(ang) * 10; z.y += Math.sin(ang) * 10;

                    // Effect เลือดสาด
                    // ของใหม่ (สีแดงเลือด)
                    gameState.particles.push(new Particle(z.x, z.y, '#dc2626', 3));

                    // ถ้าเป็นกระสุนปืนปกติ ชนแล้วหายไป
                    if (proj.constructor.name === 'Bullet') proj.dead = true;
                }
            });
        }
        if (proj.dead) gameState.projectiles.splice(i, 1);
    });

    

    // Particles Update
    gameState.particles.forEach((pt, i) => {
        pt.update();
        if (pt.dead) gameState.particles.splice(i, 1);
    });

    updateUI();

    // --- DRAW WORLD ---
    ctx.save();
    ctx.translate(-gameState.camera.x, -gameState.camera.y);

    // 1. วาดพื้น/กำแพง (เรียกจาก Level)
    level.draw(ctx);

    // (ถ้าอยากวาด Grid ทับหรือรองพื้น ก็วาดตรงนี้ได้ แต่ใน level.draw มีวาดกำแพงทับไปแล้ว)
    // วาดขอบโลกเพิ่มความชัดเจน
    ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);

    // 2. วาด Entities
    gameState.projectiles.forEach(proj => proj.draw(ctx));
    gameState.particles.forEach(pt => pt.draw(ctx));
    gameState.zombies.forEach(z => z.draw(ctx));
    p.draw(ctx);

    ctx.restore();
}

// --- GAME CONTROL ---
function gameOver() {
    gameState.active = false;
    menuScreen.classList.remove('hidden');
    skillsHud.classList.add('hidden');
    menuScreen.querySelector('h1').innerText = "GAME OVER";
    startBtn.innerText = "Reincarnate (Restart)";
}

// ผูกปุ่ม Start
if (startBtn) {
    startBtn.onclick = () => {
        console.log("Start Clicked");
        menuScreen.classList.add('hidden');
        skillsHud.classList.remove('hidden');

        // Reset State
        gameState.active = true;
        gameState.score = 0;
        gameState.spawnTimer = 0;
        gameState.zombies = [];
        gameState.projectiles = [];
        gameState.particles = [];

        const charType = window.selectedCharType || 'gojo';

        // Set Icons ตามตัวละคร
        const setIcon = (id, icon) => document.getElementById(id).innerText = icon;
        if (charType === 'gojo') {
            setIcon('icon-q', '⚡'); setIcon('icon-e', '🔵'); setIcon('icon-r', '🔴'); setIcon('icon-space', '🟣');
        } else if (charType === 'sukuna') {
            setIcon('icon-q', '🔪'); setIcon('icon-e', '🔥'); setIcon('icon-r', '👹'); setIcon('icon-space', '⛩️');
        } else if (charType === 'toji') {
            setIcon('icon-q', '🔪'); setIcon('icon-e', '⛓️'); setIcon('icon-r', '🪵'); setIcon('icon-space', '💪');
        }

        gameState.player = new Player(charType, 1200, 1200, spawnObject);
    };
} else {
    console.error("❌ หาปุ่ม Start ไม่เจอ! เช็ค HTML ID='start-btn' ด่วน");
}

animate();