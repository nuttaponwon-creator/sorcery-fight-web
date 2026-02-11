import { CONFIG } from '../config.js';
import { OBSTACLES } from '../core/Level.js'; 

export class Zombie {
    constructor(player) {
        this.player = player;
        this.radius = 20;
        this.speed = 2 + Math.random() * 2;
        this.dead = false;
        
        this.maxHp = 100; // เลือดเต็ม
        this.hp = this.maxHp; 
        
        this.x = 0;
        this.y = 0;
    }
    
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    update(player) {
        if (this.hp <= 0) {
            this.dead = true;
            return;
        }
        
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        const vx = Math.cos(angle) * this.speed;
        const vy = Math.sin(angle) * this.speed;

        let nextX = this.x + vx;
        if (!this.checkCollision(nextX, this.y)) {
            this.x = nextX;
        }
        
        let nextY = this.y + vy;
        if (!this.checkCollision(this.x, nextY)) {
            this.y = nextY;
        }
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
        
        // ตัวซอมบี้
        ctx.fillStyle = '#4b5563'; 
        ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI*2); ctx.fill();
        
        // ตาแดง
        ctx.fillStyle = '#ef4444'; 
        const angle = Math.atan2(this.player.y - this.y, this.player.x - this.x);
        ctx.rotate(angle);
        ctx.beginPath(); ctx.arc(8, -6, 4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, 6, 4, 0, Math.PI*2); ctx.fill();
        
        // หมุนกลับมาแนวเดิมเพื่อวาดหลอดเลือด (ไม่ให้หลอดเลือดเอียงตามตัว)
        ctx.rotate(-angle);

        // ✅ วาดหลอดเลือด (HP Bar)
        const barWidth = 40;
        const barHeight = 6;
        const hpPercent = this.hp / this.maxHp;

        // พื้นหลังหลอด (สีดำจางๆ)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(-barWidth/2, -35, barWidth, barHeight);

        // เนื้อหลอดเลือด (สีแดง)
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-barWidth/2, -35, barWidth * hpPercent, barHeight);

        ctx.restore();
    }
}