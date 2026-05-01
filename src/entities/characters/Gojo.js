// src/entities/characters/Gojo.js
import { Player } from '../Player.js';
import { PunchBox, BlueOrb, RedOrb, HollowPurple, InfiniteVoid } from '../SkillObjects.js';
import { SKILL_SETTINGS } from '../../config.js';
import { input } from '../../core/Input.js';

export class Gojo extends Player {
    constructor(x, y, audio) {
        super(x, y, 'gojo', audio);
        this.domainTimer = 0;
        
        // Visual effects
        this.trail = [];
        this.ambientParticles = [];
        this.skillFlashTimer = 0; // For glowing eyes
        this.sweepTimer = 0; // For Hook arc
        this.idleTimer = 0; // For Reverse Cursed Technique
    }

    update() {
        super.update();

        // Trail effect
        this.trail.push({ x: this.x, y: this.y, angle: this.angle, alpha: 0.5 });
        if (this.trail.length > 8) this.trail.shift();
        this.trail.forEach(t => t.alpha -= 0.05);
        this.trail = this.trail.filter(t => t.alpha > 0);

        // Ambient upward drifting particles
        if (Math.random() < 0.3) {
            this.ambientParticles.push({
                x: this.x + (Math.random() - 0.5) * 40,
                y: this.y + (Math.random() - 0.5) * 40,
                vx: (Math.random() - 0.5) * 1,
                vy: -Math.random() * 2 - 1,
                life: 30 + Math.random() * 20
            });
        }
        this.ambientParticles.forEach(p => {
            p.x += p.vx; p.y += p.vy; p.life--;
        });
        this.ambientParticles = this.ambientParticles.filter(p => p.life > 0);

        // Eye glow timer
        if (this.skillFlashTimer > 0) this.skillFlashTimer--;
        if (this.domainTimer > 0) {
            this.domainTimer--;
            // Zero Q/E/R cooldowns during Domain (Limitless power) — NOT Space, to prevent re-casting
            this.cd.q = 0;
            this.cd.e = 0;
            this.cd.r = 0;
        }

        // Reverse Cursed Technique (RCT) Passive
        if (!this.casting.active && !this.isPunching && this.comboCount === 0) {
            this.idleTimer++;
            if (this.idleTimer >= 120 && this.health < this.maxHealth) {
                this.health = Math.min(this.maxHealth, this.health + 0.5); // Heal
                // RCT Visual (Green Sparkles)
                if (Math.random() < 0.2) {
                    this.ambientParticles.push({
                        x: this.x + (Math.random() - 0.5) * 30,
                        y: this.y + (Math.random() - 0.5) * 30,
                        vx: 0, vy: -1, life: 20, color: '#4ade80' // Green
                    });
                }
            }
        } else {
            this.idleTimer = 0;
        }
    }

    punch() {
        if (this.isPunching || this.casting.active) return;
        this.isPunching = true;
        this.idleTimer = 0;
        this.comboTimer = 45; // Window to continue combo

        let side = 1;
        let power = 35;
        let isHook = false;

        if (this.comboCount === 0) {
            side = -1; // Left Jab
        } else if (this.comboCount === 1) {
            side = 1; // Right Jab
        } else if (this.comboCount >= 2) {
            side = 0; // Center Hook
            power = 70; // High damage hook
            isHook = true;
        }

        const offsetDist = isHook ? 0 : 15;
        const offsetX = Math.cos(this.angle + Math.PI / 2) * offsetDist * side;
        const offsetY = Math.sin(this.angle + Math.PI / 2) * offsetDist * side;

        const px = this.x + Math.cos(this.angle) * 45 + offsetX;
        const py = this.y + Math.sin(this.angle) * 45 + offsetY;

        const box = new PunchBox(px, py, this.angle, { damage: power, side: side });
        if (isHook) {
            box.radius = 90; // Wide sweep
            this.sweepTimer = 15; // Trigger visual sweep
        }
        this.spawn(box);
        // if (this.audio) this.audio.playSFX('punch'); // Muted because user found it annoying

        this.comboCount++;
        if (this.comboCount > 2) this.comboCount = 0; // Reset after hook

        // Hook has longer recovery
        setTimeout(() => { this.isPunching = false; }, isHook ? 400 : 150);
    }

    skillQ() {
        if (this.cd.q > 0 || this.casting.active) return;
        this.idleTimer = 0;
        this.spawn(new BlueOrb(input.mouse.worldX, input.mouse.worldY, this.angle, SKILL_SETTINGS.gojo.blue));
        this.cd.q = this.stats.cd.q;
        this.skillFlashTimer = 30; // Eye glow!
        if (this.audio) this.audio.playSFX('blue');
    }

    skillE() {
        if (this.cd.e > 0 || this.casting.active) return;
        this.idleTimer = 0;
        this.casting.active = true; this.casting.timer = 0;
        this.casting.type = 'red'; // Charge phase
        this.skillFlashTimer = 30; // Eye glow!
        // Sound removed during charge to avoid spam
    }

    skillR() {
        if (this.cd.r > 0 || this.casting.active) return;
        this.idleTimer = 0;
        this.casting.active = true; this.casting.timer = 0;
        this.casting.type = 'purple'; 
        this.skillFlashTimer = 60; // Eye glow while charging!
        if (this.audio) this.audio.playSFX('purple_charge');
    }

    skillUlt() {
        if (this.cd.space > 0 || this.casting.active) return;
        this.idleTimer = 0;
        this.casting.active = true; this.casting.timer = 0;
        this.casting.type = 'void';
        this.skillFlashTimer = 60; // Eye glow!
        if (this.audio) this.audio.playSFX('purple_charge'); // Re-use sound for now
    }

    finishUlt() {
        this.casting.active = false;
        
        if (this.casting.type === 'red') {
            this.cd.e = this.stats.cd.e;
            this.spawn(new RedOrb(this.x, this.y, this.angle, SKILL_SETTINGS.gojo.red));
        } else if (this.casting.type === 'purple') {
            this.cd.r = this.stats.cd.r; // Set R cooldown properly
            this.spawn(new HollowPurple(this.x, this.y, this.angle));
            if (this.audio) this.audio.playSFX('purple_fire');
        } else if (this.casting.type === 'void') {
            this.cd.space = this.stats.cd.space; // Set Space cooldown
            this.spawn(new InfiniteVoid(this.x, this.y, this.angle, SKILL_SETTINGS.gojo.void));
            this.domainTimer = SKILL_SETTINGS.gojo.void.duration;
            if (this.audio) this.audio.playSFX('domain'); // Play domain sound
        }
    }
    
    draw(ctx) {
        // Draw movement trail
        this.trail.forEach(t => {
            ctx.save();
            ctx.translate(t.x, t.y);
            ctx.rotate(t.angle);
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = `rgba(59, 130, 246, ${t.alpha * 0.5})`;
            ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });

        // Draw Hook Sweep Arc
        if (this.sweepTimer > 0) {
            this.sweepTimer--;
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.globalCompositeOperation = 'lighter';
            ctx.shadowBlur = 15; ctx.shadowColor = '#ffffff';
            ctx.strokeStyle = `rgba(255, 255, 255, ${this.sweepTimer / 15})`;
            ctx.lineWidth = 12;
            ctx.lineCap = 'round';
            ctx.beginPath();
            // Wide sweeping arc in front of Gojo
            ctx.arc(0, 0, 55, -Math.PI*0.6, Math.PI*0.6);
            ctx.stroke();
            ctx.restore();
        }

        // Ambient cursed energy & RCT particles
        this.ambientParticles.forEach(p => {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const col = p.color || '#3b82f6';
            ctx.shadowBlur = 10; ctx.shadowColor = col;
            
            // Hex to RGB parser for opacity
            let r=59, g=130, b=246; // default blue
            if (col === '#4ade80') { r=74; g=222; b=128; }
            
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.life / 50})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, Math.random() * 2 + 1, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });

        // Draw Infinity Aura (Pulsing via time)
        ctx.save();
        ctx.translate(this.x, this.y);
        
        const pulse = Math.sin(Date.now() / 300) * 3;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 5 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
        ctx.shadowBlur = 15 + pulse * 2;
        ctx.shadowColor = '#bfdbfe';
        ctx.fill();
        
        ctx.rotate(this.angle);

        // Body (Black T-Shirt, Shinjuku Showdown Style)
        ctx.fillStyle = '#111827'; // Darker black t-shirt
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Messy Spiky Hair Slicked Back
        ctx.fillStyle = '#f3f4f6';
        ctx.shadowBlur = 5; ctx.shadowColor = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        for(let i=0; i<9; i++) {
            ctx.moveTo(-8, 0);
            ctx.lineTo(-15 + i*3, -22 + (i%3)*6);
            ctx.lineTo(-2 + i*2, -12);
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        // Face / Skin
        ctx.fillStyle = '#fef08a'; // Pale skin tone
        ctx.beginPath();
        ctx.ellipse(4, 0, 10, 14, 0, -Math.PI/2, Math.PI/2);
        ctx.fill();

        // The Six Eyes (Always visible, no blindfold!)
        ctx.shadowBlur = 20 + (this.skillFlashTimer > 0 ? 15 : 0); // Glows brighter during skills
        ctx.shadowColor = '#60a5fa';
        
        // Left Eye
        ctx.fillStyle = '#93c5fd';
        ctx.beginPath();
        ctx.arc(8, -5, 4, 0, Math.PI*2); 
        ctx.fill();
        
        // Right Eye
        ctx.beginPath();
        ctx.arc(8, 5, 4, 0, Math.PI*2);  
        ctx.fill();
        
        // Eye Cores (White)
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(9, -5, 1.5, 0, Math.PI*2);
        ctx.arc(9, 5, 1.5, 0, Math.PI*2);
        ctx.fill();

        ctx.restore();

        // Draw Red/Blue spheres during Purple casting or Red charging
        if (this.casting.active) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.translate(-40, 0);
            
            if (this.casting.type === 'purple') {
                const t = this.casting.timer; 
                const progress = Math.min(1, t / 60);
                const separation = 60 * (1 - progress); 
                ctx.globalCompositeOperation = 'lighter'; 
                ctx.shadowBlur = 20; ctx.shadowColor = '#3b82f6'; ctx.fillStyle = '#3b82f6'; 
                ctx.beginPath(); ctx.arc(0, -separation, 15, 0, Math.PI*2); ctx.fill();
                ctx.shadowColor = '#ef4444'; ctx.fillStyle = '#ef4444'; 
                ctx.beginPath(); ctx.arc(0, separation, 15, 0, Math.PI*2); ctx.fill();
            } else if (this.casting.type === 'red') {
                const maxHold = 120; // 2 seconds
                const progress = Math.min(1, this.casting.timer / maxHold);
                ctx.globalCompositeOperation = 'lighter'; 
                
                // Intense Red Aura (grows darker/more opaque)
                const auraOp = 0.2 + (progress * 0.6);
                ctx.shadowBlur = 30 + Math.random() * 40 * progress; 
                ctx.shadowColor = '#ef4444'; 
                ctx.fillStyle = `rgba(220, 38, 38, ${auraOp})`; // Darker red base
                ctx.beginPath(); ctx.arc(0, 0, this.radius + 10 + progress*30, 0, Math.PI*2); ctx.fill();
                
                // Sparkling particles drawn towards palm
                for(let i=0; i<4; i++) {
                    if(Math.random() < progress) {
                        const sparkDist = 10 + Math.random() * 40 * progress;
                        const sparkAng = Math.random() * Math.PI * 2;
                        ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#fca5a5';
                        ctx.beginPath();
                        ctx.arc(40 + Math.cos(sparkAng)*sparkDist, Math.sin(sparkAng)*sparkDist, 1 + Math.random()*2, 0, Math.PI*2);
                        ctx.fill();
                    }
                }

                // Compressed Red Orb at palm
                ctx.shadowBlur = 20 + progress * 20; 
                ctx.fillStyle = '#ffffff'; 
                ctx.beginPath(); ctx.arc(40, 0, 3 + (5 * progress), 0, Math.PI*2); ctx.fill(); // Core
                ctx.fillStyle = '#ef4444'; 
                ctx.beginPath(); ctx.arc(40, 0, 6 + (8 * progress), 0, Math.PI*2); ctx.fill(); // Outer
            }
            
            ctx.restore();
        }
    }
}
