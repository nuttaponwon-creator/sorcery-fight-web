// src/skills/TojiSkills.js
import { GameObject } from '../entities/GameObject.js';
import { Particle, DamageNumber } from './BaseSkills.js';

export class TojiKatanaSlash extends GameObject {
    constructor(x, y, angle, settings, ownerId = null) {
        super(x, y, ownerId);
        this.angle = angle;
        // this.owner will be set in main.js for remote, or passed in settings for local
        this.owner = settings.owner; 
        this.life = 10;
        this.maxLife = 10;
        this.damage = settings.damage;
        this.range = settings.range || 65;
        this.settings = settings;

        const offsetDist = 28;
        const sideAngle = angle + (Math.PI / 2) * (settings.offsetSide || 1);
        this.x += Math.cos(sideAngle) * offsetDist;
        this.y += Math.sin(sideAngle) * offsetDist;
        this.x += Math.cos(angle) * 42;
        this.y += Math.sin(angle) * 42;
        this.slashTilt = (Math.PI / 4) * (settings.offsetSide || 1) * -1;
        this.hitZombies = new Set();
        this.side = settings.offsetSide || 1;
    }
    update(zombies, particleList, networking = null, damageNumbers = null) {
        this.life--;
        if (this.life <= 0) this.dead = true;

        zombies.forEach(z => {
            if (!this.hitZombies.has(z.id) && Math.hypot(this.x - z.x, this.y - z.y) < this.range) {
                this.hitZombies.add(z.id);
                // ONLY local owner calculates damage and sends sync event
                if (this.isLocal) {
                    z.hp -= this.damage;
                    if (networking) networking.sendZombieHit(z.id, this.damage);
                }
                if (damageNumbers) damageNumbers.push(new DamageNumber(z.x, z.y - 20, this.damage, this.damage > 70, '#22cc44'));
                if (window.triggerShake) window.triggerShake(3, 4);
                for (let k = 0; k < 4; k++) particleList.push(new Particle(z.x, z.y, '#22cc44', 3, 8));
                particleList.push(new Particle(z.x, z.y, '#ffffff', 2, 5));
            }
        });
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + this.slashTilt);

        const ratio = this.life / this.maxLife;
        const scale = 1 + (1 - ratio) * 0.4;
        ctx.scale(scale, scale);

        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#22cc44';

        // Main blade slash shape
        ctx.beginPath();
        ctx.moveTo(-45, -8);
        ctx.quadraticCurveTo(0, -38, 65, 0);
        ctx.quadraticCurveTo(0, -22, -45, -8);
        ctx.fillStyle = `rgba(34, 204, 68, ${ratio})`;
        ctx.fill();

        // White edge highlight
        ctx.beginPath();
        ctx.moveTo(-40, -7);
        ctx.quadraticCurveTo(0, -30, 60, 0);
        ctx.strokeStyle = `rgba(255, 255, 255, ${ratio * 0.7})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }
}

export class WormProjectile extends GameObject {
    constructor(x, y, angle, settings, ownerId = null) {
        super(x, y, ownerId);
        this.vx = Math.cos(angle) * 18;
        this.vy = Math.sin(angle) * 18;
        this.angle = angle;
        this.life = 130;
        this.damage = settings.damage;
        this.maxBounces = settings.maxBounces;
        this.bounces = 0;
        this.hitTargets = new Set();
        this.currentTarget = null;
        this.bodySegments = [];
        this.eyeBlinkTimer = 0;
        this.settings = settings;
    }
    update(zombies, particleList, networking = null, damageNumbers = null) {
        this.life--;
        if (this.life <= 0 || this.bounces >= this.maxBounces) this.dead = true;

        if (this.currentTarget && !this.currentTarget.dead) {
            const tgtAngle = Math.atan2(this.currentTarget.y - this.y, this.currentTarget.x - this.x);
            this.vx = Math.cos(tgtAngle) * 22;
            this.vy = Math.sin(tgtAngle) * 22;
            this.angle = tgtAngle;
        }
        this.bodySegments.push({ x: this.x, y: this.y });
        if (this.bodySegments.length > 8) this.bodySegments.shift();
        this.x += this.vx;
        this.y += this.vy;
        this.eyeBlinkTimer++;
        if (this.life % 3 === 0) particleList.push(new Particle(this.x, this.y, '#22cc44', 2, 6));

        zombies.forEach(z => {
            if (Math.hypot(this.x - z.x, this.y - z.y) < 42 && !this.hitTargets.has(z.id)) {
                // ONLY local owner calculates damage and sends sync event
                if (this.isLocal) {
                    z.hp -= this.damage;
                    if (networking) networking.sendZombieHit(z.id, this.damage);
                }
                if (damageNumbers) damageNumbers.push(new DamageNumber(z.x, z.y - 20, this.damage, false, '#44ff77'));
                this.hitTargets.add(z.id);
                this.bounces++;
                for (let k = 0; k < 6; k++) particleList.push(new Particle(z.x, z.y, '#22cc44', 5, 10));
                particleList.push(new Particle(z.x, z.y, '#88ffaa', 4, 8));
                this.currentTarget = null;
                let minDist = Infinity;
                zombies.forEach(nz => {
                    if (!this.hitTargets.has(nz.id) && !nz.dead) {
                        const d = Math.hypot(nz.x - z.x, nz.y - z.y);
                        if (d < 400 && d < minDist) { minDist = d; this.currentTarget = nz; }
                    }
                });
                if (!this.currentTarget) this.dead = true;
            }
        });
    }
    draw(ctx) {
        ctx.save();

        // Draw body segments as trail
        this.bodySegments.forEach((seg, i) => {
            const alpha = (i / this.bodySegments.length) * 0.5;
            const r = 6 + (i / this.bodySegments.length) * 5;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#1a5c1a';
            ctx.strokeStyle = '#22cc44';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(seg.x, seg.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });

        ctx.globalAlpha = 1;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Body
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#22cc44';
        ctx.fillStyle = '#0d2a0d';
        ctx.strokeStyle = '#22cc44';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 13, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Eyes (blink every 60 frames)
        const isBlinking = (this.eyeBlinkTimer % 60 < 5);
        ctx.fillStyle = isBlinking ? '#22cc44' : '#ff4444';
        ctx.shadowBlur = isBlinking ? 5 : 12;
        ctx.shadowColor = isBlinking ? '#22cc44' : '#ff0000';
        if (!isBlinking) {
            ctx.beginPath();
            ctx.arc(6, -4, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(6, 4, 3, 0, Math.PI * 2);
            ctx.fill();
            // Pupils
            ctx.fillStyle = '#000';
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(7, -4, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(7, 4, 1.5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Squinted closed eyes
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#22cc44';
            ctx.beginPath();
            ctx.arc(6, -4, 2, 0, Math.PI);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(6, 4, 2, 0, Math.PI);
            ctx.stroke();
        }

        ctx.restore();
    }
}

export class VoidSlash extends GameObject {
    constructor(x, y, angle, settings, ownerId = null) {
        super(x, y, ownerId);
        this.owner = settings.owner;
        this.damage = settings.damage;
        this.range = settings.range;
        this.angle = angle;
        this.life = 18;
        this.maxLife = 18;
        this.hasHit = false;
        this.startX = x;
        this.startY = y;
        this.endX = x;
        this.endY = y;
        this.settings = settings;
    }
    update(zombies, particleList, networking = null, damageNumbers = null) {
        if (!this.hasHit) {
            this.hasHit = true;
            let target = null;
            let minDist = this.range;
            zombies.forEach(z => {
                const d = Math.hypot(this.owner.x - z.x, this.owner.y - z.y);
                if (d < minDist) { minDist = d; target = z; }
            });

            if (target) {
                this.startX = this.owner.x;
                this.startY = this.owner.y;
                this.owner.x = target.x - Math.cos(this.angle) * 45;
                this.owner.y = target.y - Math.sin(this.angle) * 45;
                this.endX = this.owner.x;
                this.endY = this.owner.y;

                // ONLY local owner calculates damage and sends sync event
                if (this.isLocal) {
                    target.hp -= this.damage;
                    if (networking) networking.sendZombieHit(target.id, this.damage);
                }
                
                if (damageNumbers) damageNumbers.push(new DamageNumber(target.x, target.y - 20, this.damage, true, '#88ffaa'));
                if (window.triggerShake) window.triggerShake(6, 8);

                for (let k = 0; k < 12; k++) particleList.push(new Particle(target.x, target.y, '#88ffaa', 5, 10));
                for (let k = 0; k < 5; k++) particleList.push(new Particle(target.x, target.y, '#ffffff', 4, 8));
            } else {
                this.startX = this.owner.x;
                this.startY = this.owner.y;
                this.owner.x += Math.cos(this.angle) * this.range;
                this.owner.y += Math.sin(this.angle) * this.range;
                this.endX = this.owner.x;
                this.endY = this.owner.y;
            }

            this.x = this.owner.x;
            this.y = this.owner.y;
            for (let k = 0; k < 8; k++) particleList.push(new Particle(this.endX, this.endY, '#22cc44', 4, 12));
        }

        this.life--;
        if (this.life <= 0) this.dead = true;
    }
    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.save();

        // Afterimage trail between start and end
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(34, 204, 68, ${alpha * 0.5})`;
        ctx.lineWidth = 3 + alpha * 4;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#22cc44';
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.startX, this.startY);
        ctx.lineTo(this.endX, this.endY);
        ctx.stroke();

        // Dash streak
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.startX, this.startY);
        ctx.lineTo(this.endX, this.endY);
        ctx.stroke();

        ctx.restore();
    }
}

export class AutoSlashAura extends GameObject {
    constructor(x, y, angle, settings, ownerId = null) {
        super(x, y, ownerId);
        this.owner = settings.owner;
        this.damage = settings.damage;
        this.radius = settings.radius;
        this.life = settings.duration;
        this.maxLife = settings.duration;
        this.tickRate = 12; // ~5 hits/sec
        this.tickTimer = 0;
        this.rotAngle = 0;
        this.settings = settings;
    }
    update(zombies, particleList, networking = null, damageNumbers = null) {
        this.x = this.owner.x;
        this.y = this.owner.y;
        this.life--;
        this.rotAngle += 0.08;
        if (this.life <= 0) { this.dead = true; this.owner.buffs.penalty = 120; }

        this.tickTimer++;
        if (this.tickTimer >= this.tickRate) {
            this.tickTimer = 0;
            zombies.forEach(z => {
                if (Math.hypot(this.x - z.x, this.y - z.y) < this.radius) {
                    if (this.isLocal) {
                        z.hp -= this.damage;
                        if (networking) networking.sendZombieHit(z.id, this.damage);
                    }
                    if (damageNumbers) damageNumbers.push(new DamageNumber(z.x, z.y - 20, this.damage, false, '#22cc44'));
                    const ang = Math.atan2(z.y - this.y, z.x - this.x);
                    for (let k = 0; k < 3; k++) particleList.push(new Particle(z.x, z.y, '#55dd66', 4, 8, ang + (Math.random() - 0.5)));
                }
            });
            if (window.triggerShake) window.triggerShake(2, 3);
        }
        if (Math.random() < 0.4) {
            const ang = Math.random() * Math.PI * 2;
            const r = this.radius * (0.7 + Math.random() * 0.3);
            particleList.push(new Particle(this.x + Math.cos(ang) * r, this.y + Math.sin(ang) * r, '#22cc44', 3, 10));
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        const lifeRatio = this.life / this.maxLife;
        ctx.globalCompositeOperation = 'lighter';

        // Outer glow ring
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#22cc44';
        ctx.strokeStyle = `rgba(34, 204, 68, ${0.15 + lifeRatio * 0.2})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Spinning inner ring
        ctx.rotate(this.rotAngle);
        ctx.strokeStyle = `rgba(136, 255, 170, ${0.3 * lifeRatio})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([20, 15]);
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Spinning slash marks (4 marks)
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * lifeRatio})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const ang = (i / 4) * Math.PI * 2;
            const r1 = this.radius * 0.5;
            const r2 = this.radius * 0.95;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
            ctx.lineTo(Math.cos(ang + 0.3) * r2, Math.sin(ang + 0.3) * r2);
            ctx.stroke();
        }

        ctx.restore();
    }
}
