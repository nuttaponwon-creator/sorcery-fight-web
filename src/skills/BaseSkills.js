// src/skills/BaseSkills.js
import { GameObject } from '../entities/GameObject.js';

// ─── Damage Number Popup ──────────────────────────────────────────────────────
export class DamageNumber {
    constructor(x, y, amount, isCrit = false, color = null) {
        this.x = x + (Math.random() - 0.5) * 30;
        this.y = y;
        this.amount = Math.round(amount);
        this.isCrit = isCrit;
        this.life = 55;
        this.maxLife = 55;
        this.vy = -2.2 - Math.random() * 1.2;
        this.vx = (Math.random() - 0.5) * 1.5;
        this.dead = false;
        // Color: crit=orange, large=red, normal=white
        if (color) {
            this.color = color;
        } else if (isCrit) {
            this.color = '#fbbf24'; // yellow-gold for crit
        } else if (amount >= 150) {
            this.color = '#f87171'; // red for big hits
        } else {
            this.color = '#ffffff';
        }
        this.fontSize = isCrit ? 22 + Math.min(amount / 30, 14) : 14 + Math.min(amount / 50, 10);
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy *= 0.92; // slow down
        this.life--;
        if (this.life <= 0) this.dead = true;
    }
    draw(ctx) {
        const alpha = Math.min(1, this.life / (this.maxLife * 0.4));
        const scale = this.isCrit ? (1 + (1 - this.life / this.maxLife) * 0.4) : 1;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${this.fontSize}px Arial`;
        ctx.textAlign = 'center';
        // Outline
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 4;
        ctx.strokeText(this.amount, 0, 0);
        // Fill
        ctx.fillStyle = this.color;
        ctx.shadowBlur = this.isCrit ? 12 : 4;
        ctx.shadowColor = this.color;
        ctx.fillText(this.amount, 0, 0);
        if (this.isCrit) {
            ctx.font = `bold 10px Arial`;
            ctx.fillStyle = '#fde68a';
            ctx.fillText('CRIT!', 0, -this.fontSize + 2);
        }
        ctx.restore();
    }
}

export class Particle extends GameObject {
    constructor(x, y, color, size, life = 30, angle = null) {
        super(x, y);
        this.color = color;
        this.size = size;
        this.life = life;
        this.maxLife = life;
        if (angle !== null) {
            const spd = (Math.random() * 4) + 1;
            this.vx = Math.cos(angle) * spd;
            this.vy = Math.sin(angle) * spd;
        } else {
            this.vx = (Math.random() - 0.5) * 5;
            this.vy = (Math.random() - 0.5) * 5;
        }
        this.decay = 0.92; // velocity decay
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= this.decay;
        this.vy *= this.decay;
        this.life--;
        if (this.life <= 0) this.dead = true;
    }
    draw(ctx) {
        ctx.save();
        const alpha = this.life / this.maxLife;
        const size = this.size * alpha; // shrink over time
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 4;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0.1, size), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

export class PunchBox extends GameObject {
    constructor(x, y, angle, settings, ownerId = null) {
        super(x, y, ownerId);
        this.angle = angle;
        this.damage = settings.damage || 20;
        this.side = settings.side || 1;
        this.life = 8;
        this.maxLife = 8;
        this.hitZombies = new Set();
        this.settings = settings;
    }
    update(zombies, particleList, networking = null, damageNumbers = null) {
        this.life--;
        if (this.life <= 0) this.dead = true;
        zombies.forEach(z => {
            if (!this.hitZombies.has(z.id) && Math.hypot(this.x - z.x, this.y - z.y) < 45) {
                this.hitZombies.add(z.id);
                // ONLY local owner calculates damage and sends sync event
                if (this.isLocal) {
                    z.hp -= this.damage;
                    if (networking) networking.sendZombieHit(z.id, this.damage);
                }
                // Damage number popup
                if (damageNumbers) {
                    const isCrit = this.damage >= 60;
                    damageNumbers.push(new DamageNumber(z.x, z.y - 20, this.damage, isCrit));
                }
                // Impact particles
                for (let k = 0; k < 4; k++) {
                    particleList.push(new Particle(z.x, z.y, '#ffffff', 3, 10));
                }
                for (let k = 0; k < 2; k++) {
                    particleList.push(new Particle(z.x, z.y, '#93c5fd', 5, 8));
                }
                if (window.triggerShake) window.triggerShake(2, 3);
            }
        });
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        const progress = 1 - (this.life / this.maxLife);
        ctx.globalAlpha = 1 - progress;

        // Punch oval
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#60a5fa';
        const punchLength = 18 + progress * 38;
        ctx.beginPath();
        ctx.ellipse(progress * 18, 0, punchLength, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // Impact ring
        if (progress > 0.5) {
            ctx.globalAlpha = (1 - progress) * 2;
            ctx.strokeStyle = '#bfdbfe';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(progress * 25, 0, punchLength * 0.7, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }
}

export class SlashVisual extends GameObject {
    constructor(x, y, angle = null, color = '#ef4444') {
        super(x, y);
        this.angle = angle !== null ? angle : Math.random() * Math.PI * 2;
        this.length = 80 + Math.random() * 50;
        this.width = 6 + Math.random() * 4;
        this.life = 12;
        this.maxLife = 12;
        this.color = color;
    }
    update() { this.life--; if (this.life <= 0) this.dead = true; }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        const r = this.life / this.maxLife;
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowBlur = 12;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.moveTo(-this.length / 2, 0);
        ctx.quadraticCurveTo(0, -this.width, this.length / 2, 0);
        ctx.quadraticCurveTo(0, -10, -this.length / 2, 0);
        ctx.fillStyle = `rgba(255, 255, 255, ${r})`;
        ctx.fill();
        // Colored inner
        ctx.beginPath();
        ctx.moveTo(-this.length / 2, 0);
        ctx.quadraticCurveTo(0, -this.width * 0.5, this.length / 2, 0);
        ctx.fillStyle = `rgba(${this.color}, ${r * 0.6})`;
        ctx.fill();
        ctx.restore();
    }
}
