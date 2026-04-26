// src/entities/Player.js

import { CHAR_DATA, CONFIG, SKILL_SETTINGS } from '../config.js';
import { OBSTACLES } from '../core/Level.js';
import { input } from '../core/Input.js';

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
    CursedSpeech,
    RikaClaw,
    ManifestRika
} from './SkillObjects.js';

export class Player {
    constructor(x, y, type = 'gojo') {
        this.type = type;
        // ป้องกัน Error ถ้าหา Type ไม่เจอ ให้เป็น Gojo
        this.stats = CHAR_DATA[type] || CHAR_DATA['gojo'];
        this.x = x;
        this.y = y;
        this.radius = CONFIG.PLAYER_RADIUS;
        this.angle = 0;
        
        this.maxHealth = this.stats.hp;
        this.health = this.maxHealth;
        this.isDead = false;

        this.cd = { q: 0, e: 0, r: 0, space: 0 };
        this.isPunching = false;
        this.comboCount = 0;
        this.comboTimer = 0;

        this.casting = { active: false, type: '', timer: 0 };
        this.buffs = { heavenly: 0 };

        this.spawnObjectCallback = null;
    }

    update() {
        if (this.isDead) return;

        // Skill Cooldowns
        for (let key in this.cd) if (this.cd[key] > 0) this.cd[key]--;
        if (this.comboTimer > 0) this.comboTimer--;
        if (this.buffs.heavenly > 0) this.buffs.heavenly--;

        // Movement
        const speed = this.stats.speed * (this.buffs.heavenly > 0 ? CHAR_DATA.toji.heavenly.speedBuff : 1);
        let moveX = 0, moveY = 0;
        if (input.keys['w']) moveY -= 1;
        if (input.keys['s']) moveY += 1;
        if (input.keys['a']) moveX -= 1;
        if (input.keys['d']) moveX += 1;

        if (moveX !== 0 || moveY !== 0) {
            const mag = Math.hypot(moveX, moveY);
            const nextX = this.x + (moveX / mag) * speed;
            const nextY = this.y + (moveY / mag) * speed;
            if (!this.checkWall(nextX, nextY)) {
                this.x = nextX;
                this.y = nextY;
            }
        }

        // Angle
        if (input.isMobile) {
            if (input.joystickActive) this.angle = input.joystickAngle;
        } else {
            this.angle = Math.atan2(input.mouse.y - (window.innerHeight/2), input.mouse.x - (window.innerWidth/2));
        }

        // Casting
        if (this.casting.active) {
            this.casting.timer++;
            if (this.casting.timer >= 60) {
                this.finishUlt();
            }
        }
    }

    checkWall(x, y) {
        for (const wall of OBSTACLES) {
            if (x > wall.x && x < wall.x + wall.w && y > wall.y && y < wall.y + wall.h) return true;
        }
        return false;
    }

    spawn(obj) { if (this.spawnObjectCallback) this.spawnObjectCallback(obj); }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.casting.active && this.type === 'gojo') {
            ctx.save(); ctx.rotate(this.angle); ctx.translate(-40, 0);
            const t = this.casting.timer; 
            const progress = Math.min(1, t / 60);
            const separation = 60 * (1 - progress); 
            ctx.globalCompositeOperation = 'lighter'; 
            ctx.shadowBlur = 20; ctx.shadowColor = '#3b82f6'; ctx.fillStyle = '#3b82f6'; 
            ctx.beginPath(); ctx.arc(0, -separation, 15, 0, Math.PI*2); ctx.fill();
            ctx.shadowColor = '#ef4444'; ctx.fillStyle = '#ef4444'; 
            ctx.beginPath(); ctx.arc(0, separation, 15, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }

        ctx.rotate(this.angle);
        ctx.shadowBlur = 15; ctx.shadowColor = this.stats.color;
        ctx.fillStyle = this.stats.color; ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(15, 10, 6, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(15, -10, 6, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }

    punch() {
        if (this.type === 'gojo') {
            if (this.comboTimer > 0) this.comboCount++; else this.comboCount = 1;
            this.comboTimer = 30; 
            const offset = (this.comboCount % 2 === 0) ? -20 : 20;
            const px = this.x + Math.cos(this.angle) * 30 + Math.cos(this.angle + Math.PI/2) * offset;
            const py = this.y + Math.sin(this.angle) * 30 + Math.sin(this.angle + Math.PI/2) * offset;
            this.spawn(new PunchBox(px, py, this.angle, 25)); 
        } else if (this.type === 'sukuna') {
            this.spawn(new CleaveSlash(this.x, this.y, this.angle));
        } else { 
            const side = (Math.random() < 0.5 ? 1 : -1);
            this.spawn(new KatanaSlash(this.x, this.y, this.angle, this, side));
        }
    }

    skillQ() {
        if (this.cd.q > 0) return; this.cd.q = this.stats.cd.q;
        if (this.type === 'gojo') {
            this.x += Math.cos(this.angle) * 200; this.y += Math.sin(this.angle) * 200;
        } else if (this.type === 'yuta') {
            const settings = SKILL_SETTINGS.yuta.cursedSpeech;
            this.spawn(new CursedSpeech(this.x, this.y, settings));
        } else if (this.type === 'toji') {
            this.spawn(new InvertedSpear(this.x, this.y, this.angle));
        }
    }

    skillE() {
        if (this.cd.e > 0) return; this.cd.e = this.stats.cd.e;
        if (this.type === 'gojo') { this.spawn(new BlueOrb(this.x, this.y, SKILL_SETTINGS.gojo.blue)); } 
        else if (this.type === 'sukuna') { this.spawn(new FireArrow(this.x, this.y, this.angle)); } 
        else if (this.type === 'yuta') { this.spawn(new RikaClaw(this.x, this.y, this.angle, SKILL_SETTINGS.yuta.rikaClaw)); }
        else { this.spawn(new TojiBullet(this.x, this.y, this.angle)); }
    }

    skillR() {
        if (this.cd.r > 0) return; this.cd.r = this.stats.cd.r;
        if (this.type === 'gojo') { this.spawn(new RedOrb(this.x, this.y, this.angle, SKILL_SETTINGS.gojo.red)); } 
        else if (this.type === 'sukuna') { this.spawn(new WorldSlash(this.x, this.y, this.angle, SKILL_SETTINGS.sukuna.worldSlash)); }
    }

    skillUlt() {
        if (this.cd.space > 0 || this.casting.active) return;
        this.casting.active = true; this.casting.timer = 0;
        this.casting.type = this.type === 'gojo' ? 'purple' : (this.type === 'sukuna' ? 'shrine' : (this.type === 'yuta' ? 'manifest' : 'heavenly'));
    }

    finishUlt() {
        this.casting.active = false;
        this.cd.space = this.stats.cd.space;
        if (this.casting.type === 'purple') this.spawn(new HollowPurple(this.x, this.y, this.angle));
        else if (this.casting.type === 'shrine') this.spawn(new MalevolentShrineObject(this.x, this.y, SKILL_SETTINGS.sukuna.shrine));
        else if (this.casting.type === 'manifest') this.spawn(new ManifestRika(this.x, this.y, SKILL_SETTINGS.yuta.manifest));
        else if (this.casting.type === 'heavenly') this.buffs.heavenly = CHAR_DATA.toji.heavenly.duration;
    }
}