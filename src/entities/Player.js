// src/entities/Player.js

import { CHAR_DATA, CONFIG, SKILL_SETTINGS } from '../config.js';
import { OBSTACLES } from '../core/Level.js';
import { input } from '../core/Input.js';

// ✅ เพิ่ม DismantleSlash เข้ามา
import { 
    PunchBox, 
    BlueOrb, 
    RedOrb, 
    HollowPurple, 
    FireArrow, 
    SlashVisual, 
    WorldSlash, 
    InvertedSpear, 
    KatanaSlash, 
    MalevolentShrineObject, 
    CleaveSlash, 
    TojiBullet,
    DismantleSlash 
} from './SkillObjects.js';

export class Player {
    constructor(type, x, y, spawnerCallback) {
        this.type = type;
        this.stats = CHAR_DATA[type];
        this.x = x;
        this.y = y;
        this.radius = 22;
        this.angle = 0;
        this.health = this.stats.hp;
        this.maxHealth = this.stats.hp;
        this.holdTimer = 0;
        
        this.cd = { q: 0, e: 0, r: 0, space: 0 };
        this.casting = { active: false, type: null, timer: 0 };
        this.spawn = spawnerCallback; 
        
        this.isPunching = false;
        this.comboCount = 0; 
        this.comboTimer = 0;
    }

    update(camera) {
        for (let k in this.cd) if (this.cd[k] > 0) this.cd[k]--;
        
        if (this.comboTimer > 0) this.comboTimer--;
        if (this.comboTimer <= 0) this.comboCount = 0;

        // Casting Logic
        if (this.casting.active) {
            this.casting.timer++;
            
            if (this.type === 'gojo' && this.casting.type === 'purple') {
                if (this.casting.timer >= 60) {
                    this.spawn(new HollowPurple(this.x, this.y, this.angle));
                    this.casting.active = false;
                }
            } 
            else if (this.type === 'toji' && this.casting.type === 'heavenly') {
                if (this.casting.timer > SKILL_SETTINGS.toji.heavenly.duration) this.casting.active = false;
                if(this.casting.timer % 5 === 0) this.spawn(new SlashVisual(this.x, this.y));
            }
        }

        // --- SKILL HOLD LOGIC ---
        if (this.type === 'sukuna' && input.keys['q'] && this.cd.q <= 0) {
            this.cd.q = 10;
            const spread = (Math.random() - 0.5) * 1.5;
            const dist = 50 + Math.random() * 100;
            const sx = this.x + Math.cos(this.angle + spread) * dist;
            const sy = this.y + Math.sin(this.angle + spread) * dist;
            
            // ✅ ใช้ DismantleSlash (มีดาเมจ) แทน SlashVisual (ไม่มีดาเมจ)
            this.spawn(new DismantleSlash(sx, sy)); 
        }

        if (this.type === 'toji' && input.keys['r'] && this.cd.r <= 0) {
            this.cd.r = 1; // เร็วขึ้นอีกนิด
            
            // ✅ ฟันรอบตัว (Random 360 องศา)
            const randAngle = Math.random() * Math.PI * 2; 
            const side = Math.random() < 0.5 ? -1 : 1;
            
            // สร้าง Slash ที่หมุนไปทางอื่น (แต่ยังอ้างอิงตำแหน่งตัวละคร)
            // เราต้องหลอกตัว KatanaSlash ว่า "หน้า" ของตัวละครหันไปทางไหน
            // โดยการส่ง randAngle ไปแทน this.angle
            this.spawn(new KatanaSlash(this.x, this.y, randAngle, this, side));
        }

        let moveSpeed = this.stats.speed;
        if (this.casting.active && this.casting.type === 'purple') moveSpeed *= 0.1;
        if (this.type === 'toji' && this.casting.active && this.casting.type === 'heavenly') moveSpeed *= SKILL_SETTINGS.toji.heavenly.speedBuff;

        let dx = 0, dy = 0;
        if (input.keys['w']) dy -= 1; if (input.keys['s']) dy += 1;
        if (input.keys['a']) dx -= 1; if (input.keys['d']) dx += 1;
        if (input.joystick.active) { dx = input.joystick.x; dy = input.joystick.y; }

        if (dx !== 0 || dy !== 0) {
            const len = Math.hypot(dx, dy); const scale = (len > 1) ? 1/len : 1;
            let nextX = this.x + dx * scale * moveSpeed;
            if (!this.checkCollision(nextX, this.y)) this.x = nextX;
            let nextY = this.y + dy * scale * moveSpeed;
            if (!this.checkCollision(this.x, nextY)) this.y = nextY;
        }

        this.x = Math.max(this.radius, Math.min(CONFIG.WORLD_WIDTH - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(CONFIG.WORLD_HEIGHT - this.radius, this.y));
        input.mouse.worldX = input.mouse.x + camera.x; input.mouse.worldY = input.mouse.y + camera.y;
        this.angle = Math.atan2(input.mouse.worldY - this.y, input.mouse.worldX - this.x);
    }

    checkCollision(x, y) {
        if (!OBSTACLES) return false;
        for (let obs of OBSTACLES) {
            const closestX = Math.max(obs.x, Math.min(x, obs.x + obs.w)); const closestY = Math.max(obs.y, Math.min(y, obs.y + obs.h));
            const distSq = (x - closestX)**2 + (y - closestY)**2;
            if (distSq < (this.radius * this.radius)) return true;
        }
        return false;
    }

    draw(ctx) {
        ctx.save(); 
        ctx.translate(this.x, this.y); 

        if (this.type === 'gojo' && this.casting.active && this.casting.type === 'purple') {
            ctx.save(); ctx.rotate(this.angle); ctx.translate(-40, 0);
            const t = this.casting.timer; 
            const maxTime = 60;
            const progress = Math.min(1, t / maxTime);
            const separation = 60 * (1 - progress); 

            ctx.globalCompositeOperation = 'lighter'; 
            ctx.shadowBlur = 20; ctx.shadowColor = '#3b82f6'; ctx.fillStyle = '#3b82f6'; 
            ctx.beginPath(); ctx.arc(0, -separation, 15, 0, Math.PI*2); ctx.fill();
            
            ctx.shadowColor = '#ef4444'; ctx.fillStyle = '#ef4444'; 
            ctx.beginPath(); ctx.arc(0, separation, 15, 0, Math.PI*2); ctx.fill();
            
            if (progress > 0.5) {
                ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 3 + Math.random()*2;
                ctx.beginPath(); ctx.moveTo(0, -separation); ctx.lineTo(0, separation); ctx.stroke();
            }
            ctx.restore();
        }
        
        if (this.type === 'toji' && this.casting.active) { 
            ctx.strokeStyle = '#10b981'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-30, -30); ctx.lineTo(30, -30); ctx.stroke();
            ctx.shadowBlur = 30; ctx.shadowColor = '#10b981'; 
        }

        ctx.rotate(this.angle);
        ctx.shadowBlur = 15; ctx.shadowColor = this.stats.color;
        ctx.fillStyle = this.stats.color; ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; 
        ctx.beginPath(); ctx.arc(15, 15, 8, 0, Math.PI*2); ctx.fill(); 
        ctx.beginPath(); ctx.arc(15, -15, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.ellipse(5, 8, 4, 2, 0, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(5, -8, 4, 2, 0, 0, Math.PI*2); ctx.fill();
        
        if (this.type === 'toji') { 
            ctx.save(); ctx.translate(15, 20); ctx.rotate(Math.PI / 2); ctx.scale(0.6, 0.6);
            ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-30, -3, 30, 6);
            ctx.fillStyle = '#d4d4d4'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#e5e5e5'; ctx.beginPath(); ctx.moveTo(4, -3); ctx.lineTo(12, -3); ctx.quadraticCurveTo(12, -18, 25, -12); ctx.quadraticCurveTo(20, -8, 25, -4); ctx.lineTo(50, 0); ctx.lineTo(25, 5); ctx.lineTo(4, 4); ctx.fill();
            ctx.restore();
        }
        ctx.restore();
    }

    punch() {
        if (this.type === 'gojo') {
            if (this.comboTimer > 0) this.comboCount++; else this.comboCount = 1;
            this.comboTimer = 30; 
            const offset = (this.comboCount % 2 === 0) ? -20 : 20;
            const px = this.x + Math.cos(this.angle) * 30 + Math.cos(this.angle + Math.PI/2) * offset;
            const py = this.y + Math.sin(this.angle) * 30 + Math.sin(this.angle + Math.PI/2) * offset;
            this.spawn(new PunchBox(px, py, this.angle, this, 25, this.comboCount % 3 === 0)); 
        
        } else if (this.type === 'sukuna') {
            this.spawn(new CleaveSlash(this.x, this.y, this.angle));

        } else { 
            if (this.isPunching) return; 
            this.isPunching = true;
            this.spawn(new KatanaSlash(this.x, this.y, this.angle, this, -1));
            setTimeout(() => {
                 if (!this.health || this.health <= 0) return; 
                 this.spawn(new KatanaSlash(this.x, this.y, this.angle, this, 1));
                 this.isPunching = false; 
            }, 150);
        }
    }

    skillQ() {
        if (this.type === 'sukuna') return; 

        if (this.cd.q > 0) return; this.cd.q = this.stats.cd.q;
        
        if (this.type === 'gojo') {
            let count = 0;
            const iv = setInterval(() => {
                this.x += Math.cos(this.angle)*25; this.y += Math.sin(this.angle)*25; 
                const offset = (count % 2 === 0) ? -20 : 20;
                const px = this.x + Math.cos(this.angle) * 40 + Math.cos(this.angle + Math.PI/2) * offset;
                const py = this.y + Math.sin(this.angle) * 40 + Math.sin(this.angle + Math.PI/2) * offset;
                this.spawn(new PunchBox(px, py, this.angle, this, 15));
                count++; if(count>=4) clearInterval(iv);
            }, 80);

        } else if (this.type === 'toji') { 
            this.spawn(new InvertedSpear(this.x, this.y, this.angle));
            this.x += Math.cos(this.angle) * 150; this.y += Math.sin(this.angle) * 150;
        }
    }

    skillE() {
        if (this.cd.e > 0) return; this.cd.e = this.stats.cd.e;
        if (this.type === 'gojo') { this.spawn(new BlueOrb(this.x, this.y, this.angle, this, input)); } 
        else if (this.type === 'sukuna') { this.spawn(new FireArrow(this.x, this.y, this.angle)); } 
        else { 
            let shot = 0;
            const fire = () => {
                this.spawn(new TojiBullet(this.x, this.y, this.angle + (Math.random()-0.5)*0.1));
                shot++;
                if (shot < 3) setTimeout(fire, 100);
            }
            fire();
        }
    }

    skillR() {
        if (this.type === 'toji') return; 

        if (this.cd.r > 0) return; this.cd.r = this.stats.cd.r;
        if (this.type === 'gojo') { this.spawn(new RedOrb(this.x, this.y, this.angle)); } 
        else if (this.type === 'sukuna') {
            const s = SKILL_SETTINGS.sukuna.worldSlash;
            this.spawn(new WorldSlash(this.x, this.y, this.angle, s));
            this.x -= Math.cos(this.angle) * 15; this.y -= Math.sin(this.angle) * 15;
        } 
    }

    skillUlt() {
        if (this.cd.space > 0 || this.casting.active) return;
        if (this.type === 'sukuna') {
            this.cd.space = this.stats.cd.space;
            const s = SKILL_SETTINGS.sukuna.shrine;
            this.spawn(new MalevolentShrineObject(this.x, this.y, s));
        } else {
            this.cd.space = this.stats.cd.space;
            this.casting.active = true;
            this.casting.timer = 0;
            this.casting.type = this.type === 'gojo' ? 'purple' : 'heavenly';
        }
    }
}