// src/skills/GojoSkills.js
import { GameObject } from '../entities/GameObject.js';
import { Particle } from './BaseSkills.js';
import { input } from '../core/Input.js';
import { CONFIG } from '../config.js';

export class BlueOrb extends GameObject {
    constructor(x, y, angle, settings, ownerId = null) { 
        super(x, y, ownerId); 
        this.radius = settings.radius || 100; 
        this.pull = settings.pullForce || 9; 
        this.life = settings.duration || 180;
        this.maxLife = this.life;
        this.shockwaveRadius = 0;
        this.settings = settings;
    }
    update(zombies, particleList, networking = null) {
        this.life--; if (this.life <= 0) this.dead = true;
        
        // --- POSITION TRACKING ---
        if (this.isLocal) {
            // Local follow Mouse
            if (input && input.mouse && input.mouse.worldX !== undefined) {
                this.x = input.mouse.worldX;
                this.y = input.mouse.worldY;
            }
            
            // Only local Gojo updates the Timer Bar UI
            const timerContainer = document.getElementById('blue-timer-container');
            const timerBar = document.getElementById('blue-timer-bar');
            if (timerContainer) {
                timerContainer.classList.remove('hidden');
                timerBar.style.transform = `scaleX(${this.life / this.maxLife})`;
            }
        } else if (networking && networking.remotePlayers && this.ownerId) {
            // Remote follow the owner player's current position
            const owner = networking.remotePlayers[this.ownerId];
            if (owner) {
                // Since mouse position isn't synced, we'll make it orbit the owner or stay offset 
                // A better approach: Follow the owner's position + direction they are facing
                this.x = owner.x + Math.cos(owner.angle) * 80;
                this.y = owner.y + Math.sin(owner.angle) * 80;
            }
        }

        zombies.forEach(z => {
            const dist = Math.hypot(this.x - z.x, this.y - z.y);
            if (dist < 400 && dist > 10) { // Large pull radius
                const ang = Math.atan2(this.y - z.y, this.x - z.x);
                z.x += Math.cos(ang) * this.pull * 2; z.y += Math.sin(ang) * this.pull * 2;
                
                if (dist < this.radius && this.life % 10 === 0) {
                    // Only local owner damages zombies to avoid double-counting in multiplayer
                    if (this.isLocal) {
                        z.hp -= 2;
                        // BlueOrb is low damage per tick, maybe don't broadcast every tick to save bandwidth
                        // But if we want perfect sync:
                        if (networking) networking.sendZombieHit(z.id, 2);
                    }
                }
            }
        });
        
        // Hide timer when dead (only for local)
        if (this.dead && this.isLocal) {
            const timerContainer = document.getElementById('blue-timer-container');
            if (timerContainer) timerContainer.classList.add('hidden');
        }
        for(let i=0; i<3; i++) particleList.push(new Particle(this.x + (Math.random()-0.5)*this.radius, this.y + (Math.random()-0.5)*this.radius, '#3b82f6', 2));
        
        // Expanding shockwave on initial spawn
        if (this.maxLife - this.life < 15) {
            this.shockwaveRadius += 30;
        }
    }
    draw(ctx) { 
        ctx.save(); ctx.translate(this.x, this.y); ctx.globalCompositeOperation = 'lighter'; 
        
        // Initial shockwave ring
        if (this.maxLife - this.life < 15) {
            ctx.beginPath();
            ctx.arc(0, 0, this.shockwaveRadius, 0, Math.PI*2);
            ctx.strokeStyle = `rgba(59, 130, 246, ${1 - (this.maxLife - this.life)/15})`;
            ctx.lineWidth = 10;
            ctx.stroke();
        }

        ctx.shadowBlur = 20 + Math.sin(Date.now()/100)*10; 
        ctx.shadowColor = '#3b82f6'; 
        
        // Swirling core
        const grad = ctx.createRadialGradient(0,0,0, 0,0,this.radius);
        grad.addColorStop(0, '#bfdbfe');
        grad.addColorStop(0.5, '#3b82f6');
        grad.addColorStop(1, 'rgba(30, 58, 138, 0.2)');
        
        ctx.fillStyle = grad; 
        ctx.beginPath(); ctx.arc(0,0, this.radius, 0, Math.PI*2); ctx.fill(); 
        
        // Gravitational ripple rings
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;
        const ripple = (Date.now() / 10) % this.radius;
        ctx.beginPath(); ctx.arc(0,0, ripple, 0, Math.PI*2); ctx.stroke();

        ctx.restore(); 
    }
}

export class RedOrb extends GameObject {
    constructor(x, y, angle, settings, ownerId = null) { 
        super(x, y, ownerId); 
        this.angle = angle; 
        this.vx = Math.cos(angle) * 35; 
        this.vy = Math.sin(angle) * 35;
        this.damage = settings.damage || 60; 
        this.push = settings.pushForce || 250; 
        this.life = 30; 
        this.radius = 5; 
        this.explosionRadius = settings.radius || 150;
        this.settings = settings;
    }
    update(zombies, particleList, networking = null) {
        this.life--;
        this.x += this.vx; this.y += this.vy;
        
        // Trail
        particleList.push(new Particle(this.x, this.y, '#ef4444', 3));

        // Check impact
        let hit = false;
        zombies.forEach(z => {
            if (Math.hypot(this.x - z.x, this.y - z.y) < z.radius + 20) hit = true;
        });

        if (this.life <= 0 || hit) {
            this.dead = true;
            this.explode(zombies, particleList, networking);
        }
    }
    explode(zombies, particleList, networking = null) {
        // Red debris particles
        for(let i=0; i<40; i++) {
            particleList.push(new Particle(this.x, this.y, Math.random() > 0.5 ? '#ff0000' : '#fca5a5', Math.random()*15 + 5, 20));
        }
        
        // Play synthetic explosion sound
        if (window.AudioContext || window.webkitAudioContext) {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if(audioCtx.state === 'suspended') audioCtx.resume();
            const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
            gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.5);
            
            const bufferSize = audioCtx.sampleRate * 0.5;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for(let i=0; i<bufferSize; i++) data[i] = Math.random() * 2 - 1;
            const noise = audioCtx.createBufferSource(); noise.buffer = buffer;
            const noiseFilter = audioCtx.createBiquadFilter(); noiseFilter.type = 'lowpass'; noiseFilter.frequency.value = 400;
            const noiseGain = audioCtx.createGain(); noiseGain.gain.setValueAtTime(1.0, audioCtx.currentTime);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(audioCtx.destination); noise.start();
        }

        zombies.forEach(z => { 
            if (Math.hypot(this.x - z.x, this.y - z.y) < this.explosionRadius) { 
                const ang = Math.atan2(z.y - this.y, z.x - this.x); 
                z.x += Math.cos(ang) * this.push; z.y += Math.sin(ang) * this.push; 
                
                if (this.isLocal) {
                    z.hp -= this.damage; 
                    if (networking) networking.sendZombieHit(z.id, this.damage);
                }
            } 
        });
    }
    draw(ctx) { 
        ctx.save(); ctx.translate(this.x, this.y); ctx.globalCompositeOperation = 'lighter'; 
        
        // Heat distortion shimmer
        const shimmer = Math.random() * 5;
        ctx.shadowBlur = 30 + shimmer; ctx.shadowColor = '#ff0000'; 
        
        const rad = this.dead ? this.explosionRadius : this.radius;
        const grad = ctx.createRadialGradient(0,0,0, 0,0,rad + shimmer);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, '#fca5a5');
        grad.addColorStop(0.7, '#ef4444');
        grad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = grad; 
        ctx.beginPath(); ctx.arc(0,0, rad + shimmer, 0, Math.PI*2); ctx.fill(); 
        
        ctx.restore(); 
    }
}

export class HollowPurple extends GameObject {
    constructor(x, y, angle, settings, ownerId = null) { 
        super(x, y, ownerId); 
        this.angle = angle;
        this.vx = Math.cos(angle)*8; 
        this.vy = Math.sin(angle)*8; 
        this.life = 150; 
        this.maxLife = 150;
        this.radius = 150; 
        this.originX = x;
        this.originY = y;
        this.settings = settings;
        
        // Play Anime Voice Line (Murasaki)
        if (window.gameAudio) {
            window.gameAudio.playSFX('purple_voice');
        }
    }
    update(zombies, particleList, networking = null) {
        this.x += this.vx; this.y += this.vy; this.life--; if(this.life <= 0) this.dead = true;
        for(let i=0; i<5; i++) particleList.push(new Particle(this.x + (Math.random()-0.5)*120, this.y + (Math.random()-0.5)*120, '#d8b4fe', 3, 1));
        zombies.forEach(z => { 
            if(Math.hypot(this.x - z.x, this.y - z.y) < this.radius + z.radius) { 
                if (this.isLocal) {
                    z.hp = -999; 
                    if (networking) networking.sendZombieHit(z.id, 999);
                }
                for(let k=0; k<10; k++) particleList.push(new Particle(z.x, z.y, '#a855f7', Math.random()*5+2, 10)); 
            } 
        });
    }
    draw(ctx) {
        ctx.save(); 
        
        // Screen Vignette flash (rendered globally relative to camera if possible, but here we just draw massive overlay)
        if (this.maxLife - this.life < 10) {
            ctx.fillStyle = `rgba(168, 85, 247, ${0.8 * (1 - (this.maxLife - this.life)/10)})`;
            // Huge rectangle covering the screen area roughly
            ctx.fillRect(this.x - 2000, this.y - 2000, 4000, 4000);
        }

        // Beam trail erasing terrain
        ctx.beginPath();
        ctx.moveTo(this.originX, this.originY);
        ctx.lineTo(this.x, this.y);
        ctx.lineWidth = this.radius * 2;
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.2)';
        ctx.stroke();

        ctx.translate(this.x, this.y); ctx.globalCompositeOperation = 'lighter'; ctx.shadowBlur = 60; ctx.shadowColor = '#a855f7';
        
        // Rotating purple/pink core
        ctx.rotate(Date.now() / 200);
        const grad = ctx.createLinearGradient(-this.radius, -this.radius, this.radius, this.radius); 
        grad.addColorStop(0, '#f472b6'); // Pink
        grad.addColorStop(0.5, '#a855f7'); // Purple
        grad.addColorStop(1, '#3b82f6'); // Blue
        
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0,0, this.radius, 0, Math.PI*2); ctx.fill();
        
        // White energy core
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath(); ctx.arc(0,0, this.radius * 0.4, 0, Math.PI*2); ctx.fill();
        
        ctx.restore();
    }
}

export class InfiniteVoid extends GameObject {
    constructor(x, y, angle, settings, ownerId = null) {
        super(x, y, ownerId); this.radius = settings.radius || 1000; this.life = settings.duration || 240;
        this.frozenZombies = [];
        this.settings = settings;
        
        // Play Anime Voice Line (Muryoukuusho)
        if (window.gameAudio) {
            window.gameAudio.playSFX('domain_voice');
        }
        
        const kanji = document.getElementById('void-kanji');
        if (kanji) kanji.classList.remove('hidden');
    }
    update(zombies, particleList) {
        this.life--; if (this.life <= 0) this.dead = true;
        
        this.frozenZombies = [];
        zombies.forEach(z => {
            if (Math.hypot(this.x - z.x, this.y - z.y) < this.radius) {
                z.stunTimer = 10; // Stun every frame
                this.frozenZombies.push(z);
            }
        });
        if(this.life % 5 === 0) {
            for(let i=0; i<5; i++) particleList.push(new Particle(this.x + (Math.random()-0.5)*this.radius*2, this.y + (Math.random()-0.5)*this.radius*2, '#a855f7', 4));
        }
        
        // Notify level to invert grid (ONLY for local Gojo to prevent conflicts)
        if (this.isLocal && window.levelInstance) {
            window.levelInstance.isVoidActive = true;
            if (this.life <= 1) {
                window.levelInstance.isVoidActive = false;
                const kanji = document.getElementById('void-kanji');
                if (kanji) kanji.classList.add('hidden');
            }
        }
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y);
        ctx.beginPath(); ctx.arc(0,0,this.radius,0,Math.PI*2);
        
        // Inverted colors domain effect
        const grad = ctx.createRadialGradient(0,0,0, 0,0,this.radius);
        grad.addColorStop(0, 'rgba(0,0,0,0.98)');
        grad.addColorStop(0.8, 'rgba(10,0,20,0.9)');
        grad.addColorStop(1, 'rgba(168,85,247,0.4)');
        ctx.fillStyle = grad; ctx.fill();
        
        ctx.shadowBlur = 50; ctx.shadowColor = 'white';
        ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 5; ctx.stroke();
        ctx.restore();

        // Draw ∞ above frozen zombies
        ctx.save();
        ctx.fillStyle = 'white';
        ctx.shadowBlur = 10; ctx.shadowColor = '#a855f7';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        this.frozenZombies.forEach(z => {
            ctx.fillText('∞', z.x, z.y - z.radius - 10);
        });
        ctx.restore();
    }
}
