// src/skills/SukunaSkills.js
import { GameObject } from '../entities/GameObject.js';
import { Particle, DamageNumber } from './BaseSkills.js';
import { SKILL_SETTINGS } from '../config.js';

export class DismantleWave extends GameObject {
    constructor(x, y, angle, settings, ownerId = null) {
        super(x, y, ownerId);
        this.vx = Math.cos(angle) * 28;
        this.vy = Math.sin(angle) * 28;
        this.angle = angle;
        this.life = 45;
        this.maxLife = 45;
        this.damage = settings.damage;
        this.isSecondary = settings.isSecondary;
        this.hitTargets = new Set();
        this.slashProgress = 0;
        this.settings = settings;
    }
    update(zombies, particleList, networking = null, damageNumbers = null) {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        this.slashProgress = 1 - (this.life / this.maxLife);
        if (this.life <= 0) this.dead = true;

        if (Math.random() < 0.6) {
            particleList.push(new Particle(
                this.x + (Math.random() - 0.5) * 20,
                this.y + (Math.random() - 0.5) * 20,
                this.isSecondary ? '#ff6666' : '#cc2222', 2, 8
            ));
        }

        zombies.forEach(z => {
            if (!this.hitTargets.has(z.id) && Math.hypot(this.x - z.x, this.y - z.y) < 55) {
                this.hitTargets.add(z.id);
                // ONLY local owner calculates damage and sends sync event
                if (this.isLocal) {
                    z.hp -= this.damage;
                    if (networking) networking.sendZombieHit(z.id, this.damage);
                }
                
                if (damageNumbers) damageNumbers.push(new DamageNumber(z.x, z.y - 20, this.damage, false, '#ff6666'));
                for (let k = 0; k < 6; k++) {
                    particleList.push(new Particle(z.x, z.y, this.isSecondary ? '#ff4444' : '#880000', 4, 12));
                }
            }
        });
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        const alpha = this.life / this.maxLife;
        const w = 60 + this.slashProgress * 20;
        const h = 8 + (1 - this.slashProgress) * 10;

        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.isSecondary ? '#ff6666' : '#cc0000';

        // Main slash arc
        ctx.beginPath();
        ctx.moveTo(-w * 0.5, -h);
        ctx.quadraticCurveTo(0, h * 0.5, w * 0.5, -h);
        ctx.strokeStyle = this.isSecondary ? `rgba(255, 80, 80, ${alpha * 0.7})` : `rgba(200, 0, 0, ${alpha})`;
        ctx.lineWidth = this.isSecondary ? 3 : 6;
        ctx.stroke();

        // White core slash line
        ctx.beginPath();
        ctx.moveTo(-w * 0.4, 0);
        ctx.lineTo(w * 0.4, 0);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }
}

export class CleaveSlash extends GameObject {
    constructor(x, y, angle, settings, ownerId = null) {
        super(x, y, ownerId);
        this.angle = angle;
        this.life = 12;
        this.maxLife = 12;
        this.damage = settings.damage;
        this.isSecondary = settings.isSecondary;
        this.hitZombies = new Set();
        this.arcProgress = 0;
        this.settings = settings;
    }
    update(zombies, particleList, networking = null, damageNumbers = null) {
        this.life--;
        this.arcProgress = 1 - (this.life / this.maxLife);
        if (this.life <= 0) this.dead = true;

        const stats = SKILL_SETTINGS.sukuna.cleave;
        zombies.forEach(z => {
            if (!this.hitZombies.has(z.id) && Math.hypot(this.x - z.x, this.y - z.y) < 85) {
                this.hitZombies.add(z.id);

                let finalDamage = this.damage;
                const hpPercent = z.hp / (z.maxHp || 100);
                const isExecute = hpPercent < stats.executeThreshold;
                if (isExecute) {
                    finalDamage *= stats.executeMultiplier;
                    for (let k = 0; k < 12; k++) particleList.push(new Particle(z.x, z.y, '#ff0000', 6, 15));
                    for (let k = 0; k < 6; k++) particleList.push(new Particle(z.x, z.y, '#ffffff', 4, 10));
                    if (window.triggerShake) window.triggerShake(8, 10);
                }
                if (z.burnTimer > 0) finalDamage *= 1.3;

                // ONLY local owner calculates damage and sends sync event
                if (this.isLocal) {
                    z.hp -= finalDamage;
                    if (networking) networking.sendZombieHit(z.id, finalDamage);
                }
                
                if (damageNumbers) damageNumbers.push(new DamageNumber(z.x, z.y - 20, finalDamage, isExecute, isExecute ? '#ff4444' : '#ff8888'));

                for (let k = 0; k < 5; k++) {
                    particleList.push(new Particle(z.x, z.y, this.isSecondary ? '#ff6666' : '#cc0000', 3, 8));
                }
                if (window.triggerShake) window.triggerShake(3, 4);
            }
        });
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + (this.isSecondary ? Math.PI / 4 : -Math.PI / 4));

        const alpha = this.life / this.maxLife;
        const len = 70 + this.arcProgress * 30;

        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.isSecondary ? '#ff6666' : '#ff2222';

        // Main slash
        ctx.strokeStyle = this.isSecondary ? `rgba(255, 102, 102, ${alpha})` : `rgba(255, 34, 34, ${alpha})`;
        ctx.lineWidth = this.isSecondary ? 5 : 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-len * 0.5, -len * 0.6);
        ctx.quadraticCurveTo(20, 0, len * 0.5, len * 0.6);
        ctx.stroke();

        // White highlight streak
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-len * 0.4, -len * 0.5);
        ctx.lineTo(len * 0.4, len * 0.5);
        ctx.stroke();

        ctx.restore();
    }
}

export class FlameArrow extends GameObject {
    constructor(x, y, angle, settings, ownerId = null) {
        super(x, y, ownerId);
        this.vx = Math.cos(angle) * 22;
        this.vy = Math.sin(angle) * 22;
        this.angle = angle;
        this.life = 70;
        this.maxLife = 70;
        this.impactDamage = settings.impactDamage;
        this.burnDamage = settings.burnDamage;
        this.radius = settings.radius;
        this.isSecondary = settings.isSecondary;
        this.trailTimer = 0;
        this.settings = settings;
    }
    update(zombies, particleList, networking = null, damageNumbers = null) {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        this.trailTimer++;
        if (this.life <= 0) this.dead = true;

        if (this.trailTimer % 2 === 0) {
            for (let i = 0; i < 3; i++) {
                particleList.push(new Particle(
                    this.x + (Math.random() - 0.5) * 10,
                    this.y + (Math.random() - 0.5) * 10,
                    Math.random() > 0.5 ? '#ff4400' : '#ff8800', 4, 10
                ));
            }
        }

        let hit = false;
        zombies.forEach(z => { if (Math.hypot(this.x - z.x, this.y - z.y) < 32) hit = true; });

        if (hit) {
            this.dead = true;
            if (window.triggerShake) window.triggerShake(7, 12);
            for (let i = 0; i < 25; i++) {
                particleList.push(new Particle(
                    this.x + (Math.random() - 0.5) * 30,
                    this.y + (Math.random() - 0.5) * 30,
                    Math.random() > 0.5 ? '#ff4400' : '#ffaa00', Math.random() * 8 + 3, 20
                ));
            }
            for (let i = 0; i < 10; i++) particleList.push(new Particle(this.x, this.y, '#ffffff', 5, 12));
            zombies.forEach(z => {
                if (Math.hypot(this.x - z.x, this.y - z.y) < this.radius) {
                    // ONLY local owner calculates damage and sends sync event
                    if (this.isLocal) {
                        z.hp -= this.impactDamage;
                        if (networking) networking.sendZombieHit(z.id, this.impactDamage);
                        z.burnTimer = 180;
                        z.burnDamage = this.burnDamage;
                    }
                    if (damageNumbers) damageNumbers.push(new DamageNumber(z.x, z.y - 20, this.impactDamage, true, '#ff8800'));
                }
            });
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff4400';

        // Arrow head
        ctx.fillStyle = this.isSecondary ? 'rgba(255, 100, 0, 0.7)' : '#ff2200';
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(-6, -5);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-6, 5);
        ctx.closePath();
        ctx.fill();

        // Flame core
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(0, 0, this.isSecondary ? 5 : 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

export class MalevolentShrineObject extends GameObject {
    constructor(x, y, angle, settings, ownerId = null) {
        super(x, y, ownerId);
        this.life = settings.duration;
        this.maxLife = settings.duration;
        this.slashFrequency = settings.slashFrequency;
        this.tickTimer = 0;
        this.slashPositions = []; // Store slash visuals
        this.settings = settings;
    }
    update(zombies, particleList, networking = null, damageNumbers = null) {
        this.life--;
        if (this.life <= 0) this.dead = true;

        if (Math.random() < 0.4) {
            const sx = this.x + (Math.random() - 0.5) * 1400;
            const sy = this.y + (Math.random() - 0.5) * 1000;
            const ang = Math.random() * Math.PI;
            particleList.push(new Particle(sx, sy, '#cc0000', 3, 5, ang));
            particleList.push(new Particle(sx, sy, '#ff0000', 2, 3, ang + 0.1));
        }

        this.tickTimer++;
        if (this.tickTimer >= this.slashFrequency) {
            this.tickTimer = 0;
            if (window.triggerShake) window.triggerShake(6, 6);
            zombies.forEach(z => {
                if (this.isLocal) {
                    z.hp -= 20;
                    if (networking) networking.sendZombieHit(z.id, 20);
                }
                if (damageNumbers) damageNumbers.push(new DamageNumber(z.x, z.y - 20, 20, false, '#ff4444'));
                for (let k = 0; k < 4; k++) {
                    particleList.push(new Particle(z.x, z.y, '#ff0000', 4, 8));
                }
            });
        }
    }
    draw(ctx) {
        // Darkened red screen overlay
        const progress = this.life / this.maxLife;
        ctx.fillStyle = `rgba(30, 0, 0, ${0.25 * progress})`;
        ctx.fillRect(this.x - 2000, this.y - 2000, 4000, 4000);

        ctx.save();
        ctx.translate(this.x, this.y - 180);

        const alpha = Math.min(1, this.life / 30);
        ctx.globalCompositeOperation = 'lighter';

        // Shrine glow
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 120);
        grad.addColorStop(0, `rgba(200, 0, 0, ${alpha * 0.5})`);
        grad.addColorStop(1, `rgba(100, 0, 0, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, 120, 0, Math.PI * 2);
        ctx.fill();

        // Torii gate
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = `rgba(204, 34, 34, ${alpha})`;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        // Posts
        ctx.beginPath();
        ctx.moveTo(-45, 0);
        ctx.lineTo(-45, -90);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(45, 0);
        ctx.lineTo(45, -90);
        ctx.stroke();
        // Top beams
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(-70, -90);
        ctx.lineTo(70, -90);
        ctx.stroke();
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-55, -75);
        ctx.lineTo(55, -75);
        ctx.stroke();

        ctx.restore();
    }
}
