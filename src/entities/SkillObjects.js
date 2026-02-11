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
        this.life -= 0.03;
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

// ✅ 1. เอฟเฟกต์ฟันดาบ Toji (คลื่นขาว-ดำ ตามภาพ)
export class KatanaSlash extends GameObject {
    constructor(x, y, angle, owner, offsetSide) {
        super(x, y);
        this.angle = angle; 
        this.owner = owner;
        this.life = 10; this.maxLife = 10;
        this.damage = 35; 
        
        // คำนวณตำแหน่งเริ่มต้น (ซ้าย/ขวา ของตัวละคร)
        const offsetDist = 30;
        const sideAngle = angle + (Math.PI / 2) * offsetSide; 
        this.x += Math.cos(sideAngle) * offsetDist;
        this.y += Math.sin(sideAngle) * offsetDist;
        
        // ขยับไปข้างหน้า
        this.x += Math.cos(angle) * 40;
        this.y += Math.sin(angle) * 40;

        // สุ่มองศาฟันให้ดูธรรมชาติ (เอียงนิดหน่อย)
        // ถ้า offsetSide = -1 (ซ้าย) ให้ฟันเฉียงขึ้น, 1 (ขวา) ฟันเฉียงลง
        this.slashTilt = (Math.PI / 4) * offsetSide * -1; 
    }
    update() { this.life--; if(this.life <= 0) this.dead = true; }
    
    draw(ctx) {
        ctx.save(); 
        ctx.translate(this.x, this.y); 
        // หมุนตามทิศทางผู้เล่น + มุมเฉียงของดาบ
        ctx.rotate(this.angle + this.slashTilt);
        
        const ratio = this.life / this.maxLife;
        const scale = 1 + (1 - ratio) * 0.5; // ขยายขนาดขึ้นนิดหน่อยตอนฟัน

        ctx.scale(scale, scale);

        // --- วาดคลื่นดาบ (Crescent Shape) ---
        
        // 1. ส่วนเงาสีดำ (วาดใหญ่กว่าสีขาว)
        ctx.beginPath();
        ctx.moveTo(-40, -10); // หางดาบ
        ctx.quadraticCurveTo(0, -40, 60, 0); // โค้งบน
        ctx.quadraticCurveTo(0, -25, -40, -10); // โค้งล่างกลับมาที่เดิม
        
        ctx.fillStyle = 'black';
        ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.fill();

        // 2. ส่วนคมดาบสีขาว (วาดทับลงไป)
        ctx.beginPath();
        ctx.moveTo(-35, -8); 
        ctx.quadraticCurveTo(0, -32, 55, 0); 
        ctx.quadraticCurveTo(0, -20, -35, -8); 
        
        ctx.fillStyle = 'white';
        ctx.shadowBlur = 15; ctx.shadowColor = 'white';
        ctx.fill();

        // 3. ประกายไฟ (Sparkles)
        if(ratio > 0.5) {
            ctx.fillStyle = 'white';
            ctx.beginPath(); ctx.arc(40, -10, 2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(20, -25, 1.5, 0, Math.PI*2); ctx.fill();
        }

        ctx.restore();
    }
}

// ✅ 2. ศาลามาร (Sukuna Shrine) - แก้ไม่ให้ผลัก
export class MalevolentShrineObject extends GameObject {
    constructor(x, y, settings) {
        super(x, y);
        this.radius = settings.radius;
        
        // ⛔ ตั้ง damage เป็น 0 เพื่อหลอก main.js ไม่ให้คำนวณ Knockback
        this.damage = 0; 
        
        // ✅ เก็บดาเมจจริงไว้ในตัวแปรอื่นแทน
        this.realDamage = settings.damagePerFrame;
        
        this.life = settings.duration;
        this.maxLife = settings.duration;
        this.slashFreq = settings.slashFrequency;
        this.visualSlashes = []; 
    }

    update(zombies, particleList) {
        this.life--;
        if(this.life <= 0) this.dead = true;

        zombies.forEach(z => {
            // เช็คระยะเอง และทำดาเมจเองตรงนี้
            if(Math.hypot(this.x - z.x, this.y - z.y) < this.radius) {
                z.hp -= this.realDamage; // ลดเลือดจากตัวแปรใหม่
                
                // สั่ง Stun (หยุดเดิน)
                if (z.applyStun) z.applyStun(5);
                else z.stunTimer = 5; 

                // Effect เลือด
                if(Math.random() < 0.1) particleList.push(new Particle(z.x, z.y, '#dc2626', 2));
            }
        });

        // สร้าง Visual Slash (รอยฟัน)
        if (Math.random() < this.slashFreq) {
            const angle = Math.random() * Math.PI * 2;
            const safeRadius = Math.max(0, this.radius - 40); 
            const dist = Math.random() * safeRadius;
            this.visualSlashes.push(new SlashVisual(this.x + Math.cos(angle)*dist, this.y + Math.sin(angle)*dist));
        }
        
        this.visualSlashes.forEach(s => s.update());
        this.visualSlashes = this.visualSlashes.filter(s => !s.dead);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // พื้นหลังอาณาเขต
        ctx.beginPath(); ctx.arc(0,0,this.radius,0,Math.PI*2);
        ctx.fillStyle = 'rgba(20, 0, 0, 0.3)'; ctx.fill();
        
        // ขอบเขต
        const alpha = Math.min(1, this.life / 60); 
        ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`; ctx.lineWidth = 3; 
        ctx.shadowBlur = 30; ctx.shadowColor = 'red'; ctx.stroke();
        
        // วาดรอยฟัน (ตัดขอบไม่ให้เกินวง)
        ctx.save();
        ctx.beginPath(); ctx.arc(0,0,this.radius,0,Math.PI*2); ctx.clip();
        ctx.globalCompositeOperation = 'lighter';
        this.visualSlashes.forEach(s => s.draw(ctx)); 
        ctx.restore();
        
        ctx.restore();
    }
}

export class PunchBox extends GameObject {
    constructor(x, y, angle, owner, damage = 20) {
        super(x, y); this.angle = angle; this.owner = owner; this.damage = damage;
        this.radius = 40; this.life = 8; this.maxLife = 8;
        this.color = owner.type === 'gojo' ? '#60a5fa' : '#ef4444'; 
    }
    update() { this.life--; if(this.life <= 0) this.dead = true; }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        const ratio = this.life / this.maxLife;
        ctx.globalCompositeOperation = 'lighter'; ctx.shadowBlur = 20; ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color; ctx.lineWidth = 20 * ratio; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(25, 0, 30, -Math.PI/3, Math.PI/3); ctx.stroke();
        ctx.fillStyle = 'white'; ctx.globalAlpha = ratio * 0.8;
        ctx.beginPath(); ctx.arc(35, 0, 15 * ratio, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
}

export class Bullet extends GameObject {
    constructor(x, y, angle, type) {
        super(x, y); this.velocity = { x: Math.cos(angle)*20, y: Math.sin(angle)*20 };
        this.life = 50; this.type = type; this.damage = 10; this.angle = angle;
    }
    update() { this.x += this.velocity.x; this.y += this.velocity.y; this.life--; if(this.life <= 0) this.dead = true; }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        ctx.globalCompositeOperation = 'lighter'; ctx.shadowBlur = 15; ctx.shadowColor = '#f87171';
        ctx.fillStyle = '#fee2e2'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-20, -5); ctx.lineTo(-20, 5); ctx.fill(); ctx.restore();
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
            this.angle += diff * 0.08; this.speed = Math.min(this.speed + 0.2, 14);
            this.x += Math.cos(this.angle) * this.speed; this.y += Math.sin(this.angle) * this.speed;
            if(Math.random() < 0.5) particleList.push(new Particle(this.x, this.y, '#3b82f6', 4, 0));
            zombies.forEach(z => { if (Math.hypot(this.x - z.x, this.y - z.y) < 250) { const pull = Math.atan2(this.y - z.y, this.x - z.x); z.x += Math.cos(pull) * 6; z.y += Math.sin(pull) * 6; } });
            this.life--; if(this.life <= 0) this.dead = true;
        }
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.globalCompositeOperation = 'lighter'; ctx.shadowBlur = 30; ctx.shadowColor = '#0066ff';
        ctx.fillStyle = '#0066ff'; ctx.beginPath(); ctx.arc(0,0, this.radius, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(0,0, this.radius * 0.6, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0,0, 200 + Math.sin(Date.now()/100)*10, 0, Math.PI*2); ctx.stroke(); ctx.restore();
    }
}

export class RedOrb extends GameObject {
    constructor(x, y, angle) { super(x, y); this.vx = Math.cos(angle)*12; this.vy = Math.sin(angle)*12; this.life = 60; this.radius = 10; }
    update(zombies, particleList) {
        this.x += this.vx; this.y += this.vy; this.life--;
        if(this.life % 2 === 0) particleList.push(new Particle(this.x, this.y, '#ef4444', 3, 2));
        if (this.life <= 0) { this.dead = true; this.explode(zombies, particleList); }
    }
    explode(zombies, particleList) {
        for(let i=0; i<20; i++) particleList.push(new Particle(this.x, this.y, '#ff0000', Math.random()*8, 10));
        zombies.forEach(z => { if (Math.hypot(this.x - z.x, this.y - z.y) < 200) { const ang = Math.atan2(z.y - this.y, z.x - this.x); z.x += Math.cos(ang) * 120; z.y += Math.sin(ang) * 120; z.hp -= 30; } });
    }
    draw(ctx) { ctx.save(); ctx.translate(this.x, this.y); ctx.globalCompositeOperation = 'lighter'; ctx.shadowBlur = 20; ctx.shadowColor = '#ff0000'; ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.arc(0,0, this.radius, 0, Math.PI*2); ctx.fill(); ctx.restore(); }
}

export class HollowPurple extends GameObject {
    constructor(x, y, angle) { super(x, y); this.vx = Math.cos(angle)*6; this.vy = Math.sin(angle)*6; this.life = 150; this.radius = 80; }
    update(zombies, particleList) {
        this.x += this.vx; this.y += this.vy; this.life--; if(this.life <= 0) this.dead = true;
        for(let i=0; i<3; i++) particleList.push(new Particle(this.x + (Math.random()-0.5)*100, this.y + (Math.random()-0.5)*100, '#d8b4fe', 3, 1));
        zombies.forEach(z => { if(Math.hypot(this.x - z.x, this.y - z.y) < this.radius + z.radius + 10) { z.hp = -999; for(let k=0; k<5; k++) particleList.push(new Particle(z.x, z.y, '#a855f7', 4, 5)); } });
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.globalCompositeOperation = 'lighter'; ctx.shadowBlur = 60; ctx.shadowColor = '#a855f7';
        const grad = ctx.createRadialGradient(0,0,10, 0,0,this.radius); grad.addColorStop(0, 'white'); grad.addColorStop(0.4, '#a855f7'); grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0,0, this.radius, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'white'; ctx.lineWidth = 3; for(let i=0; i<3; i++) { ctx.beginPath(); ctx.arc(0, 0, this.radius * (0.8 + Math.random()*0.4), Math.random()*Math.PI*2, Math.random()*Math.PI*2 + 1); ctx.stroke(); }
        ctx.restore();
    }
}

export class FireArrow extends GameObject {
    constructor(x, y, angle) { super(x, y); this.vx = Math.cos(angle)*18; this.vy = Math.sin(angle)*18; this.angle = angle; this.life = 60; }
    update(zombies, particleList) {
        this.x += this.vx; this.y += this.vy; this.life--;
        for(let i=0; i<3; i++) particleList.push(new Particle(this.x, this.y, '#fb923c', 5, 2));
        if (this.life <= 0) { this.dead = true; zombies.forEach(z => { if(Math.hypot(this.x - z.x, this.y - z.y) < 180) z.hp -= 60; }); for(let i=0; i<30; i++) particleList.push(new Particle(this.x, this.y, '#f97316', Math.random()*10, 8)); }
    }
    draw(ctx) { ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle); ctx.globalCompositeOperation = 'lighter'; ctx.shadowBlur = 20; ctx.shadowColor = 'orange'; ctx.fillStyle = '#ffedd5'; ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(-10, -10); ctx.lineTo(-10, 10); ctx.fill(); ctx.fillStyle = 'rgba(251, 146, 60, 0.6)'; ctx.beginPath(); ctx.arc(0,0, 15, 0, Math.PI*2); ctx.fill(); ctx.restore(); }
}

export class WorldSlash extends GameObject {
    constructor(x, y, angle, settings) { super(x, y); this.angle = angle; this.damage = settings.damage; this.radius = settings.radius; this.vx = Math.cos(angle) * settings.speed; this.vy = Math.sin(angle) * settings.speed; this.life = settings.lifespan; }
    update() { this.x += this.vx; this.y += this.vy; this.life--; if (this.life <= 0) this.dead = true; }
    draw(ctx) { ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle); const wingSpan = this.radius; const forwardBulge = wingSpan * 0.8; const backOffset = -wingSpan * 0.3; ctx.beginPath(); ctx.moveTo(backOffset, -wingSpan); ctx.quadraticCurveTo(forwardBulge, 0, backOffset, wingSpan); ctx.strokeStyle = 'black'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.shadowBlur = 20; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.stroke(); ctx.strokeStyle = 'white'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(255,255,255,0.5)'; ctx.stroke(); ctx.restore(); }
}

export class InvertedSpear extends GameObject {
    constructor(x, y, angle) { super(x, y); this.angle = angle; this.life = 15; this.speed = 25; this.vx = Math.cos(angle) * this.speed; this.vy = Math.sin(angle) * this.speed; this.damage = 40; }
    update(zombies, particleList) { this.x += this.vx; this.y += this.vy; this.life--; if(this.life<=0) this.dead=true; zombies.forEach(z => { if(Math.hypot(this.x - z.x, this.y - z.y) < 40) { z.hp -= this.damage; particleList.push(new Particle(z.x, z.y, '#10b981', 3, 5)); } }); }
    draw(ctx) { ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle); ctx.fillStyle = '#d1fae5'; ctx.beginPath(); ctx.moveTo(40,0); ctx.lineTo(-10,10); ctx.lineTo(-10,-10); ctx.fill(); ctx.strokeStyle = '#059669'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-10,0); ctx.lineTo(-30,0); ctx.stroke(); ctx.restore(); }
}

export class ChainWhip extends GameObject {
    constructor(x, y, angle, owner) { super(x, y); this.owner = owner; this.angle = angle; this.maxLen = 400; this.currentLen = 0; this.state = 'out'; this.speed = 40; }
    update(zombies) { if(this.state === 'out') { this.currentLen += this.speed; if(this.currentLen >= this.maxLen) this.state = 'in'; } else { this.currentLen -= this.speed; if(this.currentLen <= 0) this.dead = true; } const tipX = this.owner.x + Math.cos(this.angle) * this.currentLen; const tipY = this.owner.y + Math.sin(this.angle) * this.currentLen; zombies.forEach(z => { if(Math.hypot(tipX - z.x, tipY - z.y) < 50) { z.hp -= 5; } }); }
    draw(ctx) { ctx.save(); ctx.translate(this.owner.x, this.owner.y); ctx.rotate(this.angle); ctx.strokeStyle = '#525252'; ctx.lineWidth = 4; ctx.setLineDash([10, 5]); ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(this.currentLen, 0); ctx.stroke(); ctx.fillStyle = '#171717'; ctx.beginPath(); ctx.arc(this.currentLen, 0, 10, 0, Math.PI*2); ctx.fill(); ctx.restore(); }
}

export class PlayfulCloudSpin extends GameObject {
    constructor(x, y, owner) { super(x, y); this.owner = owner; this.life = 30; this.angle = 0; }
    update(zombies, particleList) { this.x = this.owner.x; this.y = this.owner.y; this.angle += 0.5; this.life--; if(this.life<=0) this.dead=true; zombies.forEach(z => { if(Math.hypot(this.x - z.x, this.y - z.y) < 130) { z.hp -= 20; const ang = Math.atan2(z.y - this.y, z.x - this.x); z.x += Math.cos(ang) * 15; z.y += Math.sin(ang) * 15; } }); }
    draw(ctx) { ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle); ctx.fillStyle = '#b91c1c'; for(let i=0; i<3; i++) { ctx.rotate(Math.PI*2/3); ctx.beginPath(); ctx.arc(80, 0, 15, 0, Math.PI*2); ctx.fill(); ctx.fillRect(0, -5, 80, 10); } ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0,0, 120, 0, Math.PI*2); ctx.stroke(); ctx.restore(); }
}

export class SlashVisual extends GameObject {
    constructor(x, y) { super(x, y); this.angle = Math.random() * Math.PI * 2; this.length = 50 + Math.random() * 50; this.life = 10; this.maxLife = 10; this.width = 2 + Math.random() * 3; }
    update() { this.life--; if (this.life <= 0) this.dead = true; }
    draw(ctx) { ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle); const ratio = this.life / this.maxLife; ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.moveTo(-this.length/2, 0); ctx.lineTo(this.length/2, 0); ctx.strokeStyle = `rgba(255, 255, 255, ${ratio})`; ctx.lineWidth = this.width; ctx.lineCap = 'round'; ctx.shadowBlur = 10; ctx.shadowColor = 'red'; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-this.length/2 * ratio, 0); ctx.lineTo(this.length/2 * ratio, 0); ctx.strokeStyle = `rgba(255, 0, 0, ${ratio * 0.8})`; ctx.lineWidth = this.width * 2; ctx.stroke(); ctx.restore(); }
}