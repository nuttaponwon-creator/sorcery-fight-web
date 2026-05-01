// src/skills/YutaSkills.js
import { GameObject } from '../entities/GameObject.js';
import { Particle } from './BaseSkills.js';
import { SKILL_SETTINGS } from '../config.js';

export class YutaKatanaSlash extends GameObject {
    constructor(x, y, angle, settings, ownerId = null) {
        super(x, y, ownerId);
        this.angle = angle;
        this.owner = settings.owner;
        this.side = settings.side;
        this.isBurst = settings.isBurst;
        this.damage = settings.damage;
        this.life = 14;
        this.maxLife = 14;
        this.hitZombies = new Set();
        this.radius = settings.isBurst
            ? SKILL_SETTINGS.yuta.katanaSlash.burstRadius
            : SKILL_SETTINGS.yuta.katanaSlash.radius;
        this.sweepAngle = 0;
        this.settings = settings;
    }
    update(zombies, particleList, networking = null) {
        // Follow owner
        this.x = this.owner.x;
        this.y = this.owner.y;
        this.angle = this.owner.angle;
        this.sweepAngle += this.side * 0.25;

        this.life--;
        if (this.life <= 0) this.dead = true;

        zombies.forEach(z => {
            const dist = Math.hypot(z.x - this.x, z.y - this.y);
            let hit = false;

            if (this.isBurst) {
                if (dist < this.radius) hit = true;
            } else {
                const angToZ = Math.atan2(z.y - this.y, z.x - this.x);
                let angDiff = angToZ - this.angle;
                while (angDiff < -Math.PI) angDiff += Math.PI * 2;
                while (angDiff > Math.PI) angDiff -= Math.PI * 2;
                if (dist < this.radius && Math.abs(angDiff) < 1.0) hit = true;
            }

            if (!this.hitZombies.has(z.id) && hit) {
                this.hitZombies.add(z.id);
                // ONLY local owner calculates damage and sends sync event
                if (this.isLocal) {
                    z.hp -= this.damage;
                    if (networking) networking.sendZombieHit(z.id, this.damage);
                }
                const n = this.isBurst ? 8 : 3;
                for (let k = 0; k < n; k++) {
                    particleList.push(new Particle(z.x, z.y, '#c084fc', 4, 10));
                }
                if (this.isBurst) {
                    for (let k = 0; k < 5; k++) {
                        particleList.push(new Particle(z.x, z.y, '#ffffff', 3, 7));
                    }
                }
            }
        });
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        const alpha = this.life / this.maxLife;

        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#d8b4fe';

        if (this.isBurst) {
            // Expanding ring burst
            const bProgress = 1 - alpha;
            const r = this.radius * (0.5 + bProgress * 0.5);

            ctx.strokeStyle = `rgba(216, 180, 254, ${alpha * 0.8})`;
            ctx.lineWidth = 8 - bProgress * 5;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = `rgba(216, 180, 254, ${alpha * 0.15})`;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Sweeping arc slash
            const sweepWidth = Math.PI * 0.55;
            const startAng = -sweepWidth * 0.5 + this.sweepAngle * 0.15 * this.side;

            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, startAng, startAng + sweepWidth * alpha);
            ctx.stroke();

            // Purple inner slash
            ctx.strokeStyle = `rgba(192, 132, 252, ${alpha * 0.6})`;
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.75, startAng + 0.1, startAng + sweepWidth * alpha - 0.1);
            ctx.stroke();

            // Tip particle streak
            const tipAng = startAng + sweepWidth * alpha;
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(
                Math.cos(tipAng) * this.radius,
                Math.sin(tipAng) * this.radius,
                4 * alpha, 0, Math.PI * 2
            );
            ctx.fill();
        }

        ctx.restore();
    }
}

export class RikaManifest extends GameObject {
    constructor(x, y, angle, settings, ownerId = null) {
        super(x, y, ownerId);
        this.radius = SKILL_SETTINGS.yuta.rikaManifest.radius;
        this.life = 35;
        this.maxLife = 35;
        this.damage = settings.damage;
        this.hitZombies = new Set();
        this.shakeOffset = { x: 0, y: 0 };
        this.settings = settings;
    }
    update(zombies, particleList, networking = null) {
        this.life--;
        if (this.life <= 0) this.dead = true;

        // Screen shake effect via offset
        if (this.life === 10) {
            zombies.forEach(z => {
                if (Math.hypot(this.x - z.x, this.y - z.y) < this.radius) {
                    // ONLY local owner calculates damage and sends sync event
                    if (this.isLocal) {
                        z.hp -= this.damage;
                        z.stunTimer = 60;
                        if (networking) networking.sendZombieHit(z.id, this.damage);
                    }

                    for (let k = 0; k < 8; k++) {
                        particleList.push(new Particle(z.x, z.y, '#1e1e2e', 6, 15));
                    }
                    for (let k = 0; k < 4; k++) {
                        particleList.push(new Particle(z.x, z.y, '#d8b4fe', 4, 10));
                    }
                }
            });
            // Impact burst
            for (let i = 0; i < 20; i++) {
                const ang = (i / 20) * Math.PI * 2;
                particleList.push(new Particle(
                    this.x + Math.cos(ang) * this.radius * 0.5,
                    this.y + Math.sin(ang) * this.radius * 0.5,
                    '#0f172a', 7, 18, ang
                ));
            }
        }

        // Drop-in particles
        if (this.life > 15 && this.life % 3 === 0) {
            for (let i = 0; i < 3; i++) {
                const ang = Math.random() * Math.PI * 2;
                particleList.push(new Particle(
                    this.x + Math.cos(ang) * this.radius * (0.3 + Math.random() * 0.7),
                    this.y + Math.sin(ang) * this.radius * (0.3 + Math.random() * 0.7),
                    '#d8b4fe', 3, 8
                ));
            }
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        const alpha = this.life / this.maxLife;

        if (this.life > 15) {
            // Drop-in phase: target circle
            const dropProgress = (this.maxLife - this.life) / (this.maxLife - 15);
            ctx.strokeStyle = `rgba(216, 180, 254, ${0.7 * alpha})`;
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 6]);
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Rika silhouette dropping
            ctx.globalAlpha = dropProgress * 0.6;
            ctx.fillStyle = '#0f172a';
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#d8b4fe';
            ctx.beginPath();
            ctx.ellipse(0, -this.radius * (1 - dropProgress), 25, 35, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Impact phase
            const impactAlpha = (this.life / 15);
            ctx.fillStyle = `rgba(15, 23, 42, ${impactAlpha * 0.8})`;
            ctx.shadowBlur = 30 * impactAlpha;
            ctx.shadowColor = '#d8b4fe';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * (1.5 - impactAlpha), 0, Math.PI * 2);
            ctx.fill();

            // Shockwave ring
            ctx.strokeStyle = `rgba(216, 180, 254, ${impactAlpha * 0.8})`;
            ctx.lineWidth = 5 * impactAlpha;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * (2 - impactAlpha), 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }
}

export class CursedSpeech extends GameObject {
    constructor(x, y, angle, settings, ownerId = null) {
        super(x, y, ownerId);
        this.radius = SKILL_SETTINGS.yuta.cursedSpeech.radius;
        this.life = 65;
        this.maxLife = 65;
        this.damage = settings.damage;
        this.stunDur = SKILL_SETTINGS.yuta.cursedSpeech.stunDuration;
        this.hitZombies = new Set();
        this.waveOffset = 0;
        this.settings = settings;
    }
    update(zombies, particleList, networking = null) {
        this.life--;
        this.waveOffset += 0.15;
        if (this.life <= 0) this.dead = true;

        const currentRad = this.radius * (1 - (this.life / this.maxLife));

        zombies.forEach(z => {
            const dist = Math.hypot(this.x - z.x, this.y - z.y);
            if (!this.hitZombies.has(z.id) && dist < currentRad) {
                this.hitZombies.add(z.id);
                if (z.stunTimer < this.stunDur) {
                    z.stunTimer = this.stunDur;
                    // ONLY local owner calculates damage and sends sync event
                    if (this.isLocal) {
                        z.hp -= this.damage;
                        if (networking) networking.sendZombieHit(z.id, this.damage);
                    }
                    // Stun particles
                    for (let k = 0; k < 6; k++) {
                        particleList.push(new Particle(z.x, z.y, '#d8b4fe', 4, 12));
                    }
                }
            }
        });
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        const alpha = this.life / this.maxLife;
        const currentRad = this.radius * (1 - alpha);

        ctx.globalCompositeOperation = 'lighter';

        // Expanding shockwave ring
        ctx.strokeStyle = `rgba(216, 180, 254, ${alpha * 0.8})`;
        ctx.lineWidth = 8 * alpha;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#a855f7';
        ctx.beginPath();
        ctx.arc(0, 0, currentRad, 0, Math.PI * 2);
        ctx.stroke();

        // Secondary ring (slightly smaller)
        if (currentRad > 30) {
            ctx.strokeStyle = `rgba(168, 85, 247, ${alpha * 0.4})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, currentRad * 0.7, 0, Math.PI * 2);
            ctx.stroke();
        }

        // "DON'T MOVE" kanji-style text above center
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#d8b4fe';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#a855f7';
        ctx.font = `bold ${18 + Math.sin(this.waveOffset) * 2}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText("動くな", 0, -currentRad - 22);
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = `rgba(216, 180, 254, ${alpha * 0.7})`;
        ctx.fillText("DON'T MOVE", 0, -currentRad - 6);

        ctx.restore();
    }
}

export class RikaTrueForm extends GameObject {
    constructor(x, y, angle, settings, ownerId = null) {
        super(x, y, ownerId);
        this.owner = settings.owner;
        this.life = SKILL_SETTINGS.yuta.rikaTrueForm.duration;
        this.maxLife = SKILL_SETTINGS.yuta.rikaTrueForm.duration;
        this.attackRate = SKILL_SETTINGS.yuta.rikaTrueForm.attackRate;
        this.damage = settings.damage;
        this.attackTimer = 0;
        this.radius = SKILL_SETTINGS.yuta.rikaTrueForm.radius;
        this.floatTime = 0;
        this.tentacleAngles = Array.from({ length: 6 }, (_, i) => i * (Math.PI / 3));
        this.settings = settings;
    }
    update(zombies, particleList, networking = null) {
        this.life--;
        this.floatTime += 0.04;
        if (this.life <= 0) this.dead = true;

        // Float around owner
        const floatX = Math.cos(this.floatTime) * 45;
        const floatY = Math.sin(this.floatTime * 0.8) * 35;
        this.x = this.owner.x + floatX;
        this.y = this.owner.y - 65 + floatY;

        // Tentacle animation
        this.tentacleAngles = this.tentacleAngles.map((a, i) => a + 0.03 * (i % 2 === 0 ? 1 : -1));

        // Ambient particles
        if (Math.random() < 0.3) {
            particleList.push(new Particle(
                this.x + (Math.random() - 0.5) * 60,
                this.y + (Math.random() - 0.5) * 60,
                Math.random() > 0.5 ? '#d8b4fe' : '#1e1e2e', 3, 10
            ));
        }

        this.attackTimer--;
        if (this.attackTimer <= 0) {
            this.attackTimer = this.attackRate;
            let closest = null;
            let minDist = Infinity;
            zombies.forEach(z => {
                const dist = Math.hypot(z.x - this.x, z.y - this.y);
                if (dist < 450 && dist < minDist) { minDist = dist; closest = z; }
            });

            if (closest) {
                // ONLY local owner calculates damage and sends sync event
                if (this.isLocal) {
                    closest.hp -= this.damage;
                    if (networking) networking.sendZombieHit(closest.id, this.damage);
                }
                for (let k = 0; k < 7; k++) {
                    particleList.push(new Particle(
                        closest.x, closest.y, '#d8b4fe', 5, 12,
                        Math.atan2(closest.y - this.y, closest.x - this.x) + (Math.random() - 0.5)
                    ));
                }
            }
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        const alpha = Math.min(1, this.life / 30);
        const lifeRatio = this.life / this.maxLife;

        // Tentacles
        this.tentacleAngles.forEach((ang, i) => {
            const len = 25 + Math.sin(this.floatTime * 2 + i) * 8;
            ctx.strokeStyle = `rgba(15, 23, 42, ${alpha * 0.8})`;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#d8b4fe';
            ctx.beginPath();
            ctx.moveTo(0, 10);
            const cx = Math.cos(ang + 0.5) * len * 0.6;
            const cy = Math.sin(ang + 0.5) * len * 0.6 + 15;
            const ex = Math.cos(ang) * len;
            const ey = Math.sin(ang) * len + 15;
            ctx.quadraticCurveTo(cx, cy, ex, ey);
            ctx.stroke();
        });

        // Body (dark cursed spirit)
        ctx.fillStyle = `rgba(15, 23, 42, ${alpha})`;
        ctx.shadowBlur = 25 * alpha;
        ctx.shadowColor = '#d8b4fe';
        ctx.beginPath();
        ctx.ellipse(0, 0, 38 + Math.sin(this.floatTime * 3) * 3, 48 + Math.cos(this.floatTime * 2) * 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing inner glow
        ctx.globalCompositeOperation = 'lighter';
        const innerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 35);
        innerGlow.addColorStop(0, `rgba(216, 180, 254, ${0.15 * lifeRatio})`);
        innerGlow.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.ellipse(0, 0, 38, 48, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        // Single large eye
        const eyePulse = Math.sin(this.floatTime * 4) * 2;
        ctx.fillStyle = `rgba(252, 207, 232, ${alpha})`;
        ctx.shadowBlur = 15; ctx.shadowColor = '#fbcfe8';
        ctx.beginPath();
        ctx.ellipse(0, -8, 11 + eyePulse, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // Slit pupil
        ctx.fillStyle = '#000';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.ellipse(0, -8, 3, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eye glow
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(252, 207, 232, ${alpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(0, -8, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
