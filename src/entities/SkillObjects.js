// src/entities/SkillObjects.js

class GameObject {
    constructor(x, y) { this.x = x; this.y = y; this.dead = false; }
}

export class Particle extends GameObject {
    constructor(x, y, color, size, speed = 2) {
        super(x, y);
        this.color = color;
        this.size = size;
        this.life = 1.0;
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * speed;
        this.vel = { x: Math.cos(angle) * velocity, y: Math.sin(angle) * velocity };
    }
    update() {
        this.x += this.vel.x;
        this.y += this.vel.y;
        this.life -= 0.04;
        if(this.life <= 0) this.dead = true;
    }
    draw(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    }
}

// --- GOJO SKILLS ---
export class PunchBox extends GameObject {
    constructor(x, y, angle, owner, damage = 20, isCombo = false) {
        super(x, y); 
        this.angle = angle; 
        this.owner = owner; 
        this.damage = damage;
        this.radius = 50; 
        this.life = 10; 
        this.maxLife = 10;
        this.color = '#3b82f6'; 
        this.isCombo = isCombo;
    }
    update() { this.life--; if(this.life <= 0) this.dead = true; }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        const ratio = this.life / this.maxLife;
        ctx.globalCompositeOperation = 'lighter'; ctx.shadowBlur = 20; ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(20, 0, 30 * (1-ratio) + 20, -Math.PI/3, Math.PI/3); ctx.stroke();
        ctx.fillStyle = 'white'; ctx.globalAlpha = ratio;
        ctx.beginPath(); ctx.arc(30, 0, 15 * ratio, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
}

export class BlueOrb extends GameObject {
    constructor(x, y, angle, owner, inputRef) {
        super(x, y); this.angle = angle; this.owner = owner; this.input = inputRef;
        this.radius = 20; this.speed = 2; this.life = 240;
    }
    update(zombies, particleList) {
        if (!this.dead && this.owner) {
            const targetAngle = Math.atan2(this.input.mouse.worldY - this.y, this.input.mouse.worldX - this.x);
            let diff = targetAngle - this.angle;
            while (diff < -Math.PI) diff += Math.PI * 2; while (diff > Math.PI) diff -= Math.PI * 2;
            this.angle += diff * 0.08; 
            this.speed = Math.min(this.speed + 0.2, 14);
            this.x += Math.cos(this.angle) * this.speed; 
            this.y += Math.sin(this.angle) * this.speed;
            
            if(Math.random() < 0.5) particleList.push(new Particle(this.x, this.y, '#3b82f6', 4, 0));
            zombies.forEach(z => { 
                if (Math.hypot(this.x - z.x, this.y - z.y) < 300) { 
                    const pull = Math.atan2(this.y - z.y, this.x - z.x); 
                    z.x += Math.cos(pull) * 8; z.y += Math.sin(pull) * 8; 
                } 
            });
            this.life--; if(this.life <= 0) this.dead = true;
        }
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); 
        ctx.globalCompositeOperation = 'lighter'; ctx.shadowBlur = 30; ctx.shadowColor = '#0066ff';
        ctx.fillStyle = 'black'; ctx.beginPath(); ctx.arc(0,0, this.radius, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#0066ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0,0, this.radius + 5, 0, Math.PI*2); ctx.stroke();
        ctx.rotate(Date.now() / 100); ctx.fillStyle = 'white'; ctx.fillRect(25, 0, 4, 4); ctx.fillRect(-25, 10, 3, 3);
        ctx.restore();
    }
}

export class RedOrb extends GameObject {
    constructor(x, y, angle) { super(x, y); this.vx = Math.cos(angle)*15; this.vy = Math.sin(angle)*15; this.life = 60; this.radius = 15; this.damage = 60; }
    update(zombies, particleList) {
        this.x += this.vx; this.y += this.vy; this.life--;
        if(this.life % 2 === 0) particleList.push(new Particle(this.x, this.y, '#ef4444', 3, 2));
        let hit = false;
        zombies.forEach(z => {
             if (!hit && Math.hypot(this.x - z.x, this.y - z.y) < 30) {
                 hit = true; this.dead = true; this.explode(zombies, particleList);
             }
        });
        if (this.life <= 0 && !this.dead) { this.dead = true; this.explode(zombies, particleList); }
    }
    explode(zombies, particleList) {
        for(let i=0; i<20; i++) particleList.push(new Particle(this.x, this.y, '#ff0000', Math.random()*8, 10));
        zombies.forEach(z => { 
            if (Math.hypot(this.x - z.x, this.y - z.y) < 200) { 
                const ang = Math.atan2(z.y - this.y, z.x - this.x); 
                z.x += Math.cos(ang) * 150; z.y += Math.sin(ang) * 150; z.hp -= this.damage; 
            } 
        });
    }
    draw(ctx) { 
        ctx.save(); ctx.translate(this.x, this.y); ctx.globalCompositeOperation = 'lighter'; 
        ctx.shadowBlur = 20; ctx.shadowColor = '#ff0000'; ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.arc(0,0, this.radius, 0, Math.PI*2); ctx.fill(); 
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(0,0, this.radius/2, 0, Math.PI*2); ctx.fill(); ctx.restore(); 
    }
}

export class HollowPurple extends GameObject {
    constructor(x, y, angle) { super(x, y); this.vx = Math.cos(angle)*8; this.vy = Math.sin(angle)*8; this.life = 150; this.radius = 100; }
    update(zombies, particleList) {
        this.x += this.vx; this.y += this.vy; this.life--; if(this.life <= 0) this.dead = true;
        for(let i=0; i<5; i++) particleList.push(new Particle(this.x + (Math.random()-0.5)*120, this.y + (Math.random()-0.5)*120, '#d8b4fe', 3, 1));
        zombies.forEach(z => { 
            if(Math.hypot(this.x - z.x, this.y - z.y) < this.radius + z.radius) { 
                z.hp = -999; for(let k=0; k<5; k++) particleList.push(new Particle(z.x, z.y, '#a855f7', 4, 5)); 
            } 
        });
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.globalCompositeOperation = 'lighter'; ctx.shadowBlur = 60; ctx.shadowColor = '#a855f7';
        const grad = ctx.createRadialGradient(0,0,20, 0,0,this.radius); 
        grad.addColorStop(0, 'white'); grad.addColorStop(0.5, '#a855f7'); grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0,0, this.radius, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'white'; ctx.lineWidth = 3; 
        for(let i=0; i<3; i++) { ctx.beginPath(); ctx.arc(0, 0, this.radius * (0.8 + Math.random()*0.4), Math.random()*Math.PI*2, Math.random()*Math.PI*2 + 1); ctx.stroke(); }
        ctx.restore();
    }
}

// --- SUKUNA SKILLS ---

// ✅ เพิ่ม Class ใหม่: DismantleSlash (สำหรับ Q สุคุนะ ให้มีดาเมจ)
export class DismantleSlash extends GameObject {
    constructor(x, y, angle) {
        super(x, y);
        this.angle = angle || Math.random() * Math.PI * 2;
        this.damage = 15; // มีดาเมจแล้ว!
        this.radius = 40; // รัศมีชน
        this.life = 12; 
        this.maxLife = 12;
        
        // Visual Properties
        this.length = 80 + Math.random() * 50; 
        this.width = 6 + Math.random() * 4; 
        this.isCross = Math.random() < 0.4;
        this.curve = 10 + Math.random() * 20;
    }
    update() { 
        this.life--; 
        if (this.life <= 0) this.dead = true;
        // ดาเมจจะถูกคำนวณใน main.js เพราะมี property damage และ radius
    }
    draw(ctx) {
        // ใช้โค้ดวาดเดียวกับ SlashVisual
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        const r = this.life / this.maxLife;
        ctx.globalCompositeOperation = 'lighter'; ctx.shadowBlur = 10; ctx.shadowColor = '#ef4444'; 
        const drawSlash = (len, w, curv, rot) => {
            ctx.save(); ctx.rotate(rot); ctx.beginPath();
            ctx.moveTo(-len / 2, 0); ctx.quadraticCurveTo(0, -w - curv, len / 2, 0); ctx.quadraticCurveTo(0, -curv, -len / 2, 0);
            ctx.fillStyle = `rgba(255, 255, 255, ${r})`; ctx.fill();
            ctx.strokeStyle = `rgba(255, 0, 0, ${r * 0.8})`; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
        };
        drawSlash(this.length, this.width, this.curve, 0);
        if (this.isCross) drawSlash(this.length * 0.8, this.width * 0.7, this.curve, (Math.PI / 2) + (Math.random() - 0.5)); 
        ctx.restore();
    }
}

// ท่าต่อยปกติ (ปรับให้กว้างขึ้น)
export class CleaveSlash extends GameObject {
    constructor(x, y, angle) {
        super(x, y); this.angle = angle; this.life = 8; this.maxLife = 8; 
        this.damage = 25; // เพิ่มดาเมจ
        this.radius = 50; // ✅ เพิ่มรัศมีให้ตีโดนง่ายขึ้น
        this.x += Math.cos(angle) * 40; this.y += Math.sin(angle) * 40;
    }
    update() { this.life--; if(this.life <= 0) this.dead = true; }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        const r = this.life / this.maxLife;
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255, 200, 200, ${r})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(0, 40); ctx.stroke(); // ขีดแนวตั้งยาวขึ้น
        ctx.beginPath(); ctx.moveTo(15, -30); ctx.lineTo(15, 30); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-15, -30); ctx.lineTo(-15, 30); ctx.stroke();
        ctx.restore();
    }
}

// SlashVisual (สำหรับอาณาเขต Shrine - ไม่มีดาเมจในตัวเอง เพราะ Shrine จัดการให้)
export class SlashVisual extends GameObject {
    constructor(x, y, angle = null) {
        super(x, y);
        this.angle = angle !== null ? angle : Math.random() * Math.PI * 2;
        this.length = 80 + Math.random() * 50; this.width = 6 + Math.random() * 4; 
        this.life = 12; this.maxLife = 12;
        this.isCross = Math.random() < 0.4; this.curve = 10 + Math.random() * 20;
    }
    update() { this.life--; if (this.life <= 0) this.dead = true; }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        const r = this.life / this.maxLife;
        ctx.globalCompositeOperation = 'lighter'; ctx.shadowBlur = 10; ctx.shadowColor = '#ef4444'; 
        const drawSlash = (len, w, curv, rot) => {
            ctx.save(); ctx.rotate(rot); ctx.beginPath();
            ctx.moveTo(-len / 2, 0); ctx.quadraticCurveTo(0, -w - curv, len / 2, 0); ctx.quadraticCurveTo(0, -curv, -len / 2, 0);
            ctx.fillStyle = `rgba(255, 255, 255, ${r})`; ctx.fill();
            ctx.strokeStyle = `rgba(255, 0, 0, ${r * 0.8})`; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
        };
        drawSlash(this.length, this.width, this.curve, 0);
        if (this.isCross) drawSlash(this.length * 0.8, this.width * 0.7, this.curve, (Math.PI / 2) + (Math.random() - 0.5)); 
        ctx.restore();
    }
}

export class FireArrow extends GameObject {
    constructor(x, y, angle) { super(x, y); this.vx = Math.cos(angle)*25; this.vy = Math.sin(angle)*25; this.angle = angle; this.life = 60; this.damage = 100; }
    update(zombies, particleList) {
        this.x += this.vx; this.y += this.vy; this.life--;
        for(let i=0; i<3; i++) particleList.push(new Particle(this.x, this.y, '#fb923c', 5, 2));
        
        let hit = false;
        zombies.forEach(z => { 
            if(!hit && Math.hypot(this.x - z.x, this.y - z.y) < 30) {
                hit = true; this.dead = true; this.explode(zombies, particleList);
            }
        });
        if (this.life <= 0 && !this.dead) { this.dead = true; this.explode(zombies, particleList); }
    }
    explode(zombies, particleList) {
        for(let i=0; i<50; i++) particleList.push(new Particle(this.x, this.y, '#f97316', Math.random()*15, 12));
        zombies.forEach(z => { 
            if(Math.hypot(this.x - z.x, this.y - z.y) < 250) { 
                z.hp -= this.damage; 
                particleList.push(new Particle(z.x, z.y, 'black', 5, 5)); 
            } 
        });
    }
    draw(ctx) { 
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle); 
        ctx.globalCompositeOperation = 'lighter'; ctx.shadowBlur = 20; ctx.shadowColor = 'orange'; 
        ctx.fillStyle = '#ffedd5'; ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(-10, -10); ctx.lineTo(-10, 10); ctx.fill(); 
        ctx.fillStyle = 'rgba(251, 146, 60, 0.6)'; ctx.beginPath(); ctx.arc(0,0, 20, 0, Math.PI*2); ctx.fill(); 
        ctx.restore(); 
    }
}

export class WorldSlash extends GameObject {
    constructor(x, y, angle, settings) { super(x, y); this.angle = angle; this.damage = settings.damage; this.radius = settings.radius; this.vx = Math.cos(angle) * settings.speed; this.vy = Math.sin(angle) * settings.speed; this.life = settings.lifespan; }
    update() { this.x += this.vx; this.y += this.vy; this.life--; if (this.life <= 0) this.dead = true; }
    draw(ctx) { 
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle); 
        const wingSpan = this.radius; const forwardBulge = wingSpan * 0.8; const backOffset = -wingSpan * 0.3; 
        ctx.beginPath(); ctx.moveTo(backOffset, -wingSpan); ctx.quadraticCurveTo(forwardBulge, 0, backOffset, wingSpan); 
        ctx.strokeStyle = 'black'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.shadowBlur = 20; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.stroke(); 
        ctx.strokeStyle = 'white'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(255,255,255,0.5)'; ctx.stroke(); 
        ctx.restore(); 
    }
}

export class MalevolentShrineObject extends GameObject {
    constructor(x, y, settings) {
        super(x, y); this.radius = settings.radius; this.damage = 0; this.realDamage = settings.damagePerFrame; 
        this.life = settings.duration; this.maxLife = settings.duration; this.slashFreq = settings.slashFrequency; this.visualSlashes = []; 
    }
    update(zombies, particleList) {
        this.life--; if(this.life <= 0) this.dead = true;
        zombies.forEach(z => {
            if(Math.hypot(this.x - z.x, this.y - z.y) < this.radius) {
                z.hp -= this.realDamage;
                if (z.applyStun) z.applyStun(5); else z.stunTimer = 5; 
                if(Math.random() < 0.1) particleList.push(new Particle(z.x, z.y, '#dc2626', 2));
            }
        });
        if (Math.random() < this.slashFreq) {
            const angle = Math.random() * Math.PI * 2; const r = Math.random() * (this.radius - 40);
            const sx = this.x + Math.cos(angle) * r; const sy = this.y + Math.sin(angle) * r;
            this.visualSlashes.push(new SlashVisual(sx, sy)); 
        }
        this.visualSlashes.forEach(s => s.update()); this.visualSlashes = this.visualSlashes.filter(s => !s.dead);
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y);
        ctx.beginPath(); ctx.arc(0,0,this.radius,0,Math.PI*2); ctx.fillStyle = 'rgba(20, 0, 0, 0.3)'; ctx.fill();
        const alpha = Math.min(1, this.life / 60); 
        ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`; ctx.lineWidth = 3; ctx.shadowBlur = 20; ctx.shadowColor = 'red'; ctx.stroke();
        this.drawShrine(ctx, alpha);
        ctx.save(); ctx.beginPath(); ctx.arc(0,0,this.radius,0,Math.PI*2); ctx.clip();
        this.visualSlashes.forEach(s => s.draw(ctx)); ctx.restore(); ctx.restore();
    }
    drawShrine(ctx, alpha) {
        ctx.save(); ctx.globalAlpha = alpha; ctx.shadowBlur = 20; ctx.shadowColor = 'black';
        ctx.fillStyle = '#1a0505'; ctx.fillRect(-60, -20, 120, 40); 
        ctx.fillStyle = '#8B0000'; ctx.fillRect(-50, -80, 15, 60); ctx.fillRect(35, -80, 15, 60); ctx.fillRect(-10, -80, 20, 60);
        ctx.fillStyle = '#2d0a0a'; ctx.beginPath(); ctx.moveTo(-90, -80); ctx.quadraticCurveTo(0, -140, 90, -80); ctx.lineTo(70, -60); ctx.quadraticCurveTo(0, -110, -70, -60); ctx.fill();
        ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.moveTo(-60, -20); ctx.lineTo(-70, -50); ctx.lineTo(-50, -20); ctx.fill(); ctx.beginPath(); ctx.moveTo(60, -20); ctx.lineTo(70, -50); ctx.lineTo(50, -20); ctx.fill();
        ctx.fillStyle = 'black'; ctx.beginPath(); ctx.arc(0, -50, 15, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'red'; ctx.font = '20px Arial'; ctx.textAlign = 'center'; ctx.fillText('⚡', 0, -45); 
        ctx.restore();
    }
}

// --- TOJI SKILLS ---

export class KatanaSlash extends GameObject {
    constructor(x, y, angle, owner, offsetSide) {
        super(x, y); this.angle = angle; this.owner = owner; this.life = 10; this.maxLife = 10; this.damage = 35; 
        const offsetDist = 30; const sideAngle = angle + (Math.PI / 2) * offsetSide; 
        this.x += Math.cos(sideAngle) * offsetDist; this.y += Math.sin(sideAngle) * offsetDist;
        this.x += Math.cos(angle) * 40; this.y += Math.sin(angle) * 40;
        this.slashTilt = (Math.PI / 4) * offsetSide * -1; 
    }
    update() { this.life--; if(this.life <= 0) this.dead = true; }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle + this.slashTilt);
        const ratio = this.life / this.maxLife; const scale = 1 + (1 - ratio) * 0.5; ctx.scale(scale, scale);
        ctx.beginPath(); ctx.moveTo(-40, -10); ctx.quadraticCurveTo(0, -40, 60, 0); ctx.quadraticCurveTo(0, -25, -40, -10); ctx.fillStyle = 'black'; ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(-35, -8); ctx.quadraticCurveTo(0, -32, 55, 0); ctx.quadraticCurveTo(0, -20, -35, -8); ctx.fillStyle = 'white'; ctx.shadowBlur = 15; ctx.shadowColor = 'white'; ctx.fill();
        if(ratio > 0.5) { ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(40, -10, 2, 0, Math.PI*2); ctx.fill(); } ctx.restore();
    }
}

export class TojiBullet extends GameObject {
    constructor(x, y, angle) {
        super(x, y); this.vx = Math.cos(angle)*40; this.vy = Math.sin(angle)*40; this.angle = angle; this.life = 40; this.damage = 30;
    }
    update(zombies, particleList) {
        this.x += this.vx; this.y += this.vy; this.life--; if(this.life <= 0) this.dead = true;
        particleList.push(new Particle(this.x, this.y, '#555', 2, 0));
        zombies.forEach(z => { 
            if(Math.hypot(this.x - z.x, this.y - z.y) < 30) { 
                z.hp -= this.damage; this.dead = true; 
                particleList.push(new Particle(z.x, z.y, 'white', 3, 5));
            } 
        });
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        ctx.fillStyle = '#fbbf24'; ctx.fillRect(-5, -2, 10, 4);
        ctx.restore();
    }
}

export class InvertedSpear extends GameObject {
    constructor(x, y, angle) { super(x, y); this.angle = angle; this.life = 20; this.speed = 35; this.vx = Math.cos(angle) * this.speed; this.vy = Math.sin(angle) * this.speed; this.damage = 50; }
    update(zombies, particleList) { this.x += this.vx; this.y += this.vy; this.life--; if(this.life<=0) this.dead=true; zombies.forEach(z => { if(Math.hypot(this.x - z.x, this.y - z.y) < 40) { z.hp -= this.damage; particleList.push(new Particle(z.x, z.y, '#10b981', 3, 5)); } }); }
    draw(ctx) { 
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle); 
        ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-30, -3, 30, 6);
        ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.beginPath(); for(let i=-28; i<0; i+=4) { ctx.moveTo(i, -3); ctx.lineTo(i+2, 3); } ctx.stroke();
        ctx.fillStyle = '#d4d4d4'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e5e5e5'; ctx.beginPath(); ctx.moveTo(4, -3); ctx.lineTo(12, -3); ctx.quadraticCurveTo(12, -18, 25, -12); ctx.quadraticCurveTo(20, -8, 25, -4); ctx.lineTo(50, 0); ctx.lineTo(25, 5); ctx.lineTo(4, 4); ctx.fill(); ctx.strokeStyle = '#999'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#fcd34d'; ctx.beginPath(); ctx.arc(-32, 0, 3, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
}