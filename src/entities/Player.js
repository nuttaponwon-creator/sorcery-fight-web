// src/entities/Player.js
import { CHAR_DATA, CONFIG, SKILL_SETTINGS } from '../config.js';
import { OBSTACLES } from '../core/Level.js';
import { input } from '../core/Input.js';

export class Player {
    constructor(x, y, type = 'gojo', audio = null) {
        this.audio = audio;
        this.type = type;
        this.stats = CHAR_DATA[type] || CHAR_DATA['gojo'];
        this.x = x;
        this.y = y;
        this.radius = CONFIG.PLAYER_RADIUS;
        this.angle = 0;
        
        this.maxHealth = this.stats.hp;
        this.health = this.maxHealth;
        this.isDead = false;

        this.maxCd = this.stats.cd;
        this.cd = { q: 0, e: 0, r: 0, space: 0 };
        this.isPunching = false;
        this.comboCount = 0;
        this.comboTimer = 0;

        this.casting = { active: false, type: '', timer: 0 };
        this.buffs = { heavenly: 0, berserk: 0, penalty: 0 };

        this.spawnObjectCallback = null;
    }

    update() {
        if (this.isDead) return;

        // Skill Cooldowns
        for (let key in this.cd) if (this.cd[key] > 0) this.cd[key]--;
        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer === 0) this.comboCount = 0;
        }
        if (this.buffs.heavenly > 0) this.buffs.heavenly--;
        if (this.buffs.berserk > 0) this.buffs.berserk--;
        if (this.buffs.penalty > 0) this.buffs.penalty--;

        // Movement
        let speed = this.stats.speed;
        if (this.buffs.heavenly > 0) speed *= 2.2;
        if (this.buffs.berserk > 0) speed *= 2; // +100%
        if (this.buffs.penalty > 0) speed *= 0.8; // -20%
        
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

        // Angle — always use worldX/worldY (set in animate loop after camera calc)
        if (input.isMobile) {
            if (input.joystickActive) this.angle = input.joystickAngle;
        } else {
            const wx = input.mouse.worldX;
            const wy = input.mouse.worldY;
            if (wx !== undefined && wy !== undefined) {
                this.angle = Math.atan2(wy - this.y, wx - this.x);
            }
            // If worldX not yet set (very first frame), keep current angle
        }

        // Casting
        if (this.casting.active) {
            this.casting.timer++;
            // Max hold for Red is 120 frames (2s), others 60
            const threshold = (this.casting.type === 'red') ? 120 : 60;
            if (this.casting.timer >= threshold) {
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

    // ฟังก์ชันเหล่านี้จะถูก Override โดยคลาสลูก
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.shadowBlur = 15; ctx.shadowColor = this.stats.color;
        ctx.fillStyle = this.stats.color; ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(15, 10, 6, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(15, -10, 6, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }

    punch() {}
    skillQ() {}
    skillE() {}
    releaseE() {
        if (this.casting.active && this.casting.type === 'red') {
            this.finishUlt();
        }
    }
    skillR() {}
    skillUlt() {}
    finishUlt() {}
}