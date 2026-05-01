// src/entities/Drops.js
import { GameObject } from './GameObject.js';
import { DamageNumber } from '../skills/BaseSkills.js';

export class DropItem extends GameObject {
    constructor(x, y, type = 'health') {
        super(x, y);
        this.type = type;
        this.radius = 16;
        this.life = 600;
        this.bob = 0;
        this.magnetRange = 80; // auto-magnet range
        this.pulseTimer = 0;
    }
    update(player, damageNumbers = null) {
        this.life--;
        if (this.life <= 0) this.dead = true;
        this.bob += 0.08;
        this.pulseTimer++;

        if (player && !player.isDead) {
            const dist = Math.hypot(this.x - player.x, this.y - player.y);

            // Magnet: drift toward player when close
            if (dist < this.magnetRange && dist > player.radius + this.radius) {
                const ang = Math.atan2(player.y - this.y, player.x - this.x);
                this.x += Math.cos(ang) * 4;
                this.y += Math.sin(ang) * 4;
            }

            if (dist < this.radius + player.radius) {
                this.dead = true;
                const healAmount = 30;
                if (this.type === 'health') {
                    const oldHp = player.health;
                    player.health = Math.min(player.maxHealth, player.health + healAmount);
                    const actualHeal = Math.round(player.health - oldHp);
                    // Show heal popup (green)
                    if (damageNumbers && actualHeal > 0) {
                        damageNumbers.push(new DamageNumber(player.x, player.y - 30, actualHeal, false, '#4ade80'));
                    }
                }
            }
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y + Math.sin(this.bob) * 5);

        const lifeRatio = this.life / 600;
        // Flash warning when about to expire (< 3 seconds)
        if (this.life < 180) {
            ctx.globalAlpha = 0.5 + Math.sin(this.pulseTimer * 0.3) * 0.5;
        }

        // Outer glow ring
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#4ade80';
        ctx.strokeStyle = `rgba(74, 222, 128, ${0.4 + Math.sin(this.pulseTimer * 0.1) * 0.2})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
        ctx.stroke();

        // Body
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
        grad.addColorStop(0, '#86efac');
        grad.addColorStop(1, '#16a34a');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Cross (+) icon
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'white';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', 0, 1);

        ctx.restore();
    }
}
