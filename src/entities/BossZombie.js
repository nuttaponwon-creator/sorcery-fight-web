import { Zombie } from './Zombie.js';
import { Particle } from '../skills/BaseSkills.js';

export class BossZombie extends Zombie {
    constructor(player, id, wave) {
        super(player, id);
        this.isBoss = true;
        this.wave = wave || 10;
        this.radius = 45; // บอสตัวใหญ่กว่า
        this.speed = 1.5 + (this.wave * 0.02); // เดินช้าลง เพื่อให้เดินช้ากว่าผู้เล่น
        this.maxHp = 1000 + (this.wave * 150); // เลือดเยอะตาม wave
        this.hp = this.maxHp;

        // Skill Timers
        this.timers = {
            smash: 0,
            dash: 0,
            minion: 0
        };
        this.isDashing = false;
        this.dashTarget = { x: 0, y: 0 };
    }

    update(player, isHost = false, gameState = null, networking = null) {
        if (this.stunTimer > 0) {
            this.stunTimer--;
            this.isStunned = true;
            return;
        }
        this.isStunned = false;

        // Smoothly interpolate to target position (for clients only)
        if (!isHost) {
            if (Math.abs(this.targetX - this.x) > 0.1 || Math.abs(this.targetY - this.y) > 0.1) {
                this.x += (this.targetX - this.x) * 0.25;
                this.y += (this.targetY - this.y) * 0.25;
                return; 
            }
        }

        if (this.hp <= 0) {
            this.dead = true;
            return;
        }

        if (!player) return;

        // --- Boss Skills (Host Only calculates AI and triggers skills) ---
        if (isHost && gameState && networking) {
            // Skill 1: Ground Smash (Wave 10+)
            if (this.wave >= 10 && !this.isDashing) {
                this.timers.smash++;
                if (this.timers.smash > 180) { // ทุก 3 วินาที (180 frames)
                    this.performSmash(gameState, networking);
                    this.timers.smash = 0;
                }
            }

            // Skill 2: Frenzy Dash (Wave 20+)
            if (this.wave >= 20) {
                if (this.isDashing) {
                    this.speed = 15; // ความเร็วพุ่ง (พุ่งเร็วมาก)
                    // หยุดพุ่งเมื่อใกล้ถึงเป้าหมาย
                    if (Math.hypot(this.x - this.dashTarget.x, this.y - this.dashTarget.y) < 20) {
                        this.isDashing = false;
                        this.speed = 1.5 + (this.wave * 0.02); // คืนความเร็วเดิม
                    }
                } else {
                    this.timers.dash++;
                    if (this.timers.dash > 300) { // ทุก 5 วินาที
                        this.isDashing = true;
                        this.dashTarget = { x: player.x, y: player.y };
                        this.timers.dash = 0;
                        // Spawn alert particles
                        for(let i=0; i<10; i++) gameState.particles.push(new Particle(this.x, this.y, 'orange', 4, 15));
                    }
                }
            }

            // Skill 3: Minion Call (Wave 30+)
            if (this.wave >= 30 && !this.isDashing) {
                this.timers.minion++;
                if (this.timers.minion > 400 && gameState.zombies.length < 15) { // ทุก ~6.5 วินาที
                    this.timers.minion = 0;
                    for (let i = 0; i < 2; i++) {
                        const z = new Zombie(gameState.player);
                        z.hp = 50 + this.wave;
                        z.speed = 3;
                        z.setPosition(this.x + (Math.random() - 0.5) * 100, this.y + (Math.random() - 0.5) * 100);
                        gameState.zombies.push(z);
                        networking.sendZombieSpawn({ id: z.id, x: z.x, y: z.y, speed: z.speed, isBoss: false });
                    }
                }
            }
        }

        // --- Movement ---
        const targetX = this.isDashing ? this.dashTarget.x : player.x;
        const targetY = this.isDashing ? this.dashTarget.y : player.y;

        const angle = Math.atan2(targetY - this.y, targetX - this.x);
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

        // Add trail effect when dashing
        if (this.isDashing && gameState && Math.random() < 0.5) {
            gameState.particles.push(new Particle(this.x, this.y, '#dc2626', 3, 10));
        }
    }

    performSmash(gameState, networking) {
        const smashRadius = 120;
        const damage = 30;
        
        // Visual effect
        for(let i=0; i<20; i++) {
            gameState.particles.push(new Particle(this.x + (Math.random()-0.5)*smashRadius, this.y + (Math.random()-0.5)*smashRadius, '#8b5cf6', 5, 20));
        }

        // Hit players (Host only detection for Smash to avoid syncing custom skill objects)
        const allPlayers = [gameState.player, ...Object.values(networking.remotePlayers)];
        allPlayers.forEach(p => {
            if (p && !p.isDead && Math.hypot(this.x - p.x, this.y - p.y) < smashRadius + p.radius) {
                if (p === gameState.player) {
                    networking.sendDamage(damage);
                }
                // (ถ้าโดนคนอื่น ไม่ต้องส่งดาเมจแทนเขา ให้เครื่องใครเครื่องมันเป็นคนส่ง แต่เนื่องจากท่าทุบนี้บอสเป็นคนทำ Host สามารถคำนวณแจกดาเมจได้เลย
                // เพื่อความง่าย เราให้ผู้เล่นโดนแค่ที่เครื่องตัวเอง)
            }
        });
    }

    draw(ctx) {
        ctx.save(); 
        ctx.translate(this.x, this.y);
        
        // ออร่าบอส
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#dc2626';

        // ตัวบอส (สีดำแดง)
        ctx.fillStyle = '#1f2937'; 
        ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        
        // ลวดลายบอส
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, this.radius - 8, 0, Math.PI*2); ctx.stroke();

        // ตาบอส (เรืองแสง)
        ctx.fillStyle = '#fca5a5';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'white';
        const target = this.player || { x: this.x + 10, y: this.y };
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        ctx.rotate(angle);
        ctx.beginPath(); ctx.arc(15, -12, 8, 0, Math.PI*2); ctx.fill(); // ตาซ้าย
        ctx.beginPath(); ctx.arc(15, 12, 8, 0, Math.PI*2); ctx.fill();  // ตาขวา
        ctx.rotate(-angle);

        // ✅ หลอดเลือด (HP Bar) - พิเศษสำหรับบอส ยาวกว่าเดิม
        const barWidth = 80;
        const barHeight = 10;
        const hpPercent = this.hp / this.maxHp;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(-barWidth/2, -this.radius - 20, barWidth, barHeight);

        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-barWidth/2, -this.radius - 20, barWidth * hpPercent, barHeight);

        // คำว่า BOSS
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', 0, -this.radius - 25);

        ctx.restore();
    }
}
