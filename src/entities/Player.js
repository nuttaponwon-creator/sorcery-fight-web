// ใช้ ../ เพื่อถอยหลัง 1 ขั้น ออกมาหา src
import { CHAR_DATA, CONFIG, SKILL_SETTINGS } from '../config.js';

// ✅ เพิ่ม OBSTACLES เข้ามาเพื่อเช็คกำแพง
import { OBSTACLES } from '../core/Level.js';

// ใช้ ../core/ เพื่อถอยออกมา แล้วเข้า core
import { input } from '../core/Input.js';

import { PunchBox, Bullet, BlueOrb, RedOrb, HollowPurple, FireArrow, SlashVisual, WorldSlash, 
         InvertedSpear, ChainWhip, PlayfulCloudSpin, KatanaSlash, MalevolentShrineObject } from './SkillObjects.js';

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
        
        this.cd = { q: 0, e: 0, r: 0, space: 0 };
        this.casting = { active: false, type: null, timer: 0 };
        
        this.spawn = spawnerCallback; 
    }

    update(camera) {
        // Cooldowns
        for (let k in this.cd) if (this.cd[k] > 0) this.cd[k]--;
        
        // Casting Logic
        if (this.casting.active) {
            this.casting.timer++;
            
            // Gojo Purple
            if (this.type === 'gojo' && this.casting.type === 'purple' && this.casting.timer >= 90) {
                this.spawn(new HollowPurple(this.x, this.y, this.angle));
                this.casting.active = false;
            } 
            // Sukuna Shrine
            else if (this.type === 'sukuna' && this.casting.type === 'shrine') {
                const s = SKILL_SETTINGS.sukuna.shrine;
                if (this.casting.timer > s.duration) this.casting.active = false;
                
                if (Math.random() < s.slashFrequency) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.random() * s.radius;
                    this.spawn(new SlashVisual(this.x + Math.cos(angle)*dist, this.y + Math.sin(angle)*dist));
                }
            }
            // Toji Heavenly Buff
            else if (this.type === 'toji' && this.casting.type === 'heavenly') {
                if (this.casting.timer > SKILL_SETTINGS.toji.heavenly.duration) this.casting.active = false;
                if(this.casting.timer % 5 === 0) this.spawn(new SlashVisual(this.x, this.y));
            }
        }

        // Movement Speed Calculation
        let moveSpeed = this.stats.speed;
        if (this.casting.active && this.casting.type === 'purple') moveSpeed *= 0.2;
        if (this.type === 'toji' && this.casting.active && this.casting.type === 'heavenly') {
             moveSpeed *= SKILL_SETTINGS.toji.heavenly.speedBuff;
        }

        let dx = 0, dy = 0;
        if (input.keys['w']) dy -= 1;
        if (input.keys['s']) dy += 1;
        if (input.keys['a']) dx -= 1;
        if (input.keys['d']) dx += 1;
        if (input.joystick.active) { dx = input.joystick.x; dy = input.joystick.y; }

        // ✅ Movement with Wall Collision (แก้ให้เดินไม่ทะลุ)
        if (dx !== 0 || dy !== 0) {
            const len = Math.hypot(dx, dy);
            const scale = (len > 1) ? 1/len : 1;
            
            // ลองขยับแกน X
            let nextX = this.x + dx * scale * moveSpeed;
            if (!this.checkCollision(nextX, this.y)) {
                this.x = nextX;
            }

            // ลองขยับแกน Y
            let nextY = this.y + dy * scale * moveSpeed;
            if (!this.checkCollision(this.x, nextY)) {
                this.y = nextY;
            }
        }

        this.x = Math.max(this.radius, Math.min(CONFIG.WORLD_WIDTH - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(CONFIG.WORLD_HEIGHT - this.radius, this.y));

        input.mouse.worldX = input.mouse.x + camera.x;
        input.mouse.worldY = input.mouse.y + camera.y;
        this.angle = Math.atan2(input.mouse.worldY - this.y, input.mouse.worldX - this.x);
    }

    // ✅ ฟังก์ชันเช็คชนกำแพง (สำคัญ!)
    checkCollision(x, y) {
        if (!OBSTACLES) return false;
        for (let obs of OBSTACLES) {
            const closestX = Math.max(obs.x, Math.min(x, obs.x + obs.w));
            const closestY = Math.max(obs.y, Math.min(y, obs.y + obs.h));
            const distanceX = x - closestX;
            const distanceY = y - closestY;
            const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

            if (distanceSquared < (this.radius * this.radius)) {
                return true; // ชน
            }
        }
        return false;
    }

    draw(ctx) {
        ctx.save(); 
        ctx.translate(this.x, this.y); 

        // --- GOJO: Purple Mixing ---
        if (this.type === 'gojo' && this.casting.active && this.casting.type === 'purple') {
            ctx.save();
            ctx.rotate(this.angle); ctx.translate(-40, 0);
            const t = this.casting.timer; const progress = Math.min(1, t / 90);
            const orbitSpeed = t * 0.2; const separation = 20 * (1 - progress);
            
            ctx.globalCompositeOperation = 'lighter';
            ctx.shadowBlur = 15; ctx.shadowColor = '#3b82f6';
            ctx.fillStyle = '#3b82f6'; 
            ctx.beginPath(); ctx.arc(Math.cos(orbitSpeed)*separation, Math.sin(orbitSpeed)*separation, 8+Math.sin(t*0.5)*2, 0, Math.PI*2); ctx.fill();
            
            ctx.shadowBlur = 15; ctx.shadowColor = '#ef4444';
            ctx.fillStyle = '#ef4444'; 
            ctx.beginPath(); ctx.arc(Math.cos(orbitSpeed+Math.PI)*separation, Math.sin(orbitSpeed+Math.PI)*separation, 8+Math.cos(t*0.5)*2, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }

        
        
        // --- TOJI: Aura ---
        if (this.type === 'toji' && this.casting.active) {
            ctx.shadowBlur = 30; ctx.shadowColor = '#10b981';
        }

        // --- CHARACTER BODY ---
        ctx.rotate(this.angle);
        ctx.shadowBlur = 15; ctx.shadowColor = this.stats.color;
        
        ctx.fillStyle = this.stats.color;
        ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(15, 15, 8, 0, Math.PI*2); ctx.fill(); 
        ctx.beginPath(); ctx.arc(15, -15, 8, 0, Math.PI*2); ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.ellipse(5, 8, 4, 2, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(5, -8, 4, 2, 0, 0, Math.PI*2); ctx.fill();
        
        if (this.type === 'toji') { ctx.fillStyle = '#333'; ctx.fillRect(-10, -25, 5, 50); }

        ctx.restore();
    }

    // --- Actions ---
    punch() {
        if (this.type === 'gojo') {
            this.spawn(new PunchBox(this.x + Math.cos(this.angle)*40, this.y + Math.sin(this.angle)*40, this.angle, this));
        } else if (this.type === 'sukuna') {
            this.spawn(new Bullet(this.x, this.y, this.angle, 'sukuna_normal'));
        } else { // ✅ TOJI: ฮุกซ้าย-ขวา ด้วย KatanaSlash
            if (this.isPunching) return; // กันกดรัว
            this.isPunching = true;
            
            // ฮุกซ้าย (offsetSide = -1)
            this.spawn(new KatanaSlash(this.x, this.y, this.angle, this, -1));
            
            // อีก 0.15 วิ ฮุกขวา (offsetSide = 1)
            setTimeout(() => {
                 if (!this.health || this.health <= 0) return; // เช็คว่ายังไม่ตาย
                 this.spawn(new KatanaSlash(this.x, this.y, this.angle, this, 1));
                 this.isPunching = false; // ปลดล็อกให้กดใหม่ได้
            }, 150);
        }
    }

    skillQ() {
        if (this.cd.q > 0) return;
        this.cd.q = this.stats.cd.q;
        if (this.type === 'gojo') {
            let count = 0;
            const iv = setInterval(() => {
                this.x += Math.cos(this.angle)*15; this.y += Math.sin(this.angle)*15;
                this.spawn(new PunchBox(this.x + Math.cos(this.angle)*35, this.y + Math.sin(this.angle)*35, this.angle, this, 10));
                count++; if(count>=3) clearInterval(iv);
            }, 100);
        } else if (this.type === 'sukuna') {
            for(let i=-1; i<=1; i++) this.spawn(new Bullet(this.x, this.y, this.angle+i*0.2, 'sukuna_cleave'));
        } else { // Toji
            this.spawn(new InvertedSpear(this.x, this.y, this.angle));
            this.x += Math.cos(this.angle) * 100; this.y += Math.sin(this.angle) * 100;
        }
    }

    skillE() {
        if (this.cd.e > 0) return;
        this.cd.e = this.stats.cd.e;
        if (this.type === 'gojo') {
            this.spawn(new BlueOrb(this.x, this.y, this.angle, this, input));
        } else if (this.type === 'sukuna') {
            this.spawn(new FireArrow(this.x, this.y, this.angle));
        } else { // Toji
            this.spawn(new ChainWhip(this.x, this.y, this.angle, this));
        }
    }

    skillR() {
        if (this.cd.r > 0) return;
        this.cd.r = this.stats.cd.r;
        if (this.type === 'gojo') {
            this.spawn(new RedOrb(this.x, this.y, this.angle));
        } else if (this.type === 'sukuna') {
            const s = SKILL_SETTINGS.sukuna.worldSlash;
            this.spawn(new WorldSlash(this.x, this.y, this.angle, s));
            this.x -= Math.cos(this.angle) * 15; this.y -= Math.sin(this.angle) * 15;
        } else { // Toji
            this.spawn(new PlayfulCloudSpin(this.x, this.y, this));
        }
    }

    skillUlt() {
        if (this.cd.space > 0 || this.casting.active) return;
        
        if (this.type === 'sukuna') {
            // ✅ SUKUNA: วางศาลามารที่พื้นทันที
            this.cd.space = this.stats.cd.space;
            const s = SKILL_SETTINGS.sukuna.shrine;
            // วางที่ตำแหน่งปัจจุบันของตัวละคร
            this.spawn(new MalevolentShrineObject(this.x, this.y, s));
        } else {
            // Gojo & Toji (ยังใช้ระบบ Casting เหมือนเดิม)
            this.cd.space = this.stats.cd.space;
            this.casting.active = true;
            this.casting.timer = 0;
            this.casting.type = this.type === 'gojo' ? 'purple' : 'heavenly';
        }
    }
}