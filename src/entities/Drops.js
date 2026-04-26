// src/entities/Drops.js
import { GameObject } from './GameObject.js';

export class DropItem extends GameObject {
    constructor(x, y, type = 'health') {
        super(x, y);
        this.type = type;
        this.radius = 15;
        this.life = 600; 
        this.bob = 0;
    }
    update(player) {
        this.life--; if(this.life <= 0) this.dead = true;
        this.bob += 0.1;
        
        if (player && !player.isDead) {
            const dist = Math.hypot(this.x - player.x, this.y - player.y);
            if (dist < this.radius + player.radius) {
                this.dead = true;
                if (this.type === 'health') {
                    player.health = Math.min(player.maxHealth, player.health + 20);
                }
            }
        }
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y + Math.sin(this.bob) * 5);
        ctx.shadowBlur = 15; ctx.shadowColor = '#10b981';
        ctx.fillStyle = '#10b981'; ctx.beginPath(); ctx.arc(0,0, this.radius, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'white'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center'; ctx.fillText('+', 0, 7);
        ctx.restore();
    }
}
