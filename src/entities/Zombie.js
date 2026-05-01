import { CONFIG } from '../config.js';
import { OBSTACLES } from '../core/Level.js'; 

export class Zombie {
    constructor(player, id) {
        this.player = player;
        this.id = id || Math.random().toString(36).substr(2, 9);
        this.radius = 20;
        this.speed = 2 + Math.random() * 2;
        this.dead = false;
        
        this.maxHp = 100; // เลือดเต็ม
        this.hp = this.maxHp; 
        
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        
        this.stunTimer = 0;
        this.isStunned = false;
        
        this.burnTimer = 0;
        this.burnDamage = 0;
    }
    
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
    }

    updateRemote(x, y, hp) {
        this.targetX = x;
        this.targetY = y;
        this.hp = hp;
    }

    update(player, isHost = false, gameState = null, networking = null) {
        // Dead check first
        if (this.hp <= 0) {
            this.dead = true;
            return;
        }

        // Burn tick
        if (this.burnTimer > 0) {
            this.burnTimer--;
            if (this.burnTimer % 15 === 0) {
                // Only host calculates burn damage to avoid double-counting in multiplayer
                if (isHost) {
                    this.hp -= this.burnDamage / 4;
                    if (networking) networking.sendZombieHit(this.id, this.burnDamage / 4);
                }
            }
        }

        // Stun
        if (this.stunTimer > 0) {
            this.stunTimer--;
            this.isStunned = true;
            return;
        }
        this.isStunned = false;

        // Client: interpolate to target position
        if (!isHost) {
            if (Math.abs(this.targetX - this.x) > 0.1 || Math.abs(this.targetY - this.y) > 0.1) {
                this.x += (this.targetX - this.x) * 0.25;
                this.y += (this.targetY - this.y) * 0.25;
                return;
            }
        }

        if (!player) return;

        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        const vx = Math.cos(angle) * this.speed;
        const vy = Math.sin(angle) * this.speed;

        let nextX = this.x + vx;
        if (!this.checkCollision(nextX, this.y)) this.x = nextX;

        let nextY = this.y + vy;
        if (!this.checkCollision(this.x, nextY)) this.y = nextY;
    }

    checkCollision(x, y) {
        if (!OBSTACLES) return false;
        for (let obs of OBSTACLES) {
            const closestX = Math.max(obs.x, Math.min(x, obs.x + obs.w));
            const closestY = Math.max(obs.y, Math.min(y, obs.y + obs.h));
            const distSq = (x - closestX)**2 + (y - closestY)**2;
            if (distSq < (this.radius * this.radius)) return true;
        }
        return false;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Burn glow
        if (this.burnTimer > 0) {
            const burnIntensity = Math.min(1, this.burnTimer / 60);
            ctx.shadowBlur = 20 * burnIntensity;
            ctx.shadowColor = '#ff4400';
        }

        // Stun glow
        if (this.isStunned) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#3b82f6';
            ctx.fillStyle = '#60a5fa';
        } else if (this.burnTimer > 0) {
            ctx.fillStyle = '#7a3a1a'; // Darkened orange-brown
        } else {
            ctx.fillStyle = '#4b5563';
        }
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Burn flame overlay
        if (this.burnTimer > 0) {
            const burnIntensity = Math.min(1, this.burnTimer / 60);
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = `rgba(255, 80, 0, ${0.3 * burnIntensity})`;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        // Eyes
        ctx.fillStyle = '#ef4444';
        const target = this.player || { x: this.x + 10, y: this.y };
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        ctx.rotate(angle);
        ctx.shadowBlur = 8; ctx.shadowColor = '#ef4444';
        ctx.beginPath(); ctx.arc(8, -6, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, 6, 4, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.rotate(-angle);

        // HP Bar
        const barWidth = 42;
        const barHeight = 5;
        const hpPercent = Math.max(0, this.hp / this.maxHp);
        const hpColor = hpPercent > 0.5 ? '#22c55e' : hpPercent > 0.25 ? '#f59e0b' : '#ef4444';

        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.beginPath();
        ctx.roundRect(-barWidth / 2, -36, barWidth, barHeight, 2);
        ctx.fill();

        ctx.fillStyle = hpColor;
        ctx.beginPath();
        ctx.roundRect(-barWidth / 2, -36, barWidth * hpPercent, barHeight, 2);
        ctx.fill();

        ctx.restore();
    }
}