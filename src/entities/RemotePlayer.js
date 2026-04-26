// src/entities/RemotePlayer.js

import { CHAR_DATA } from '../config.js';
import { 
    PunchBox, 
    BlueOrb, 
    RedOrb, 
    HollowPurple, 
    FireArrow, 
    SlashVisual, 
    WorldSlash, 
    InvertedSpear, 
    KatanaSlash, 
    MalevolentShrineObject, 
    CleaveSlash, 
    TojiBullet,
    DismantleSlash 
} from './SkillObjects.js';

export class RemotePlayer {
    constructor(type, x, y, spawnerCallback) {
        this.type = type;
        this.stats = CHAR_DATA[type];
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.radius = 22;
        this.angle = 0;
        this.spawn = spawnerCallback;
        
        this.health = this.stats.hp;
        this.maxHealth = this.stats.hp;
        this.isDead = false;
        this.name = 'Sorcerer';

        // Visual states
        this.isPunching = false;
        this.casting = { active: false, type: null, timer: 0 };
    }

    updateState(data) {
        // ALWAYS update target position even if dead to keep visuals synced
        this.targetX = data.x;
        this.targetY = data.y;
        this.angle = data.angle;
    }

    update(camera) {
        // Smoothing for movement (keep updating even if dead)
        this.x += (this.targetX - this.x) * 0.2;
        this.y += (this.targetY - this.y) * 0.2;

        if (this.isDead) return;

        // Handle local visual animations (like Gojo's Purple charge)
        if (this.casting.active) {
            this.casting.timer++;
            if (this.type === 'gojo' && this.casting.type === 'purple') {
                if (this.casting.timer >= 60) {
                    this.spawn(new HollowPurple(this.x, this.y, this.angle));
                    this.casting.active = false;
                }
            } else if (this.type === 'toji' && this.casting.type === 'heavenly') {
                if (this.casting.timer > 600) this.casting.active = false; 
                if(this.casting.timer % 5 === 0) this.spawn(new SlashVisual(this.x, this.y));
            }
        }
    }

    performAction(actionType, angle) {
        if (this.isDead) return;
        this.angle = angle; 
        
        switch(actionType) {
            case 'punch': this.punch(); break;
            case 'skillQ': this.skillQ(); break;
            case 'skillE': this.skillE(); break;
            case 'skillR': this.skillR(); break;
            case 'skillUlt': this.skillUlt(); break;
        }
    }

    draw(ctx) {
        ctx.save(); 
        ctx.translate(this.x, this.y); 

        if (this.isDead) {
            ctx.globalAlpha = 0.3;
            ctx.rotate(Math.PI / 2); // Laying down
        }

        // Drawing Gojo's Purple Charging
        if (this.type === 'gojo' && this.casting.active && this.casting.type === 'purple') {
            ctx.save(); ctx.rotate(this.angle); ctx.translate(-40, 0);
            const progress = Math.min(1, this.casting.timer / 60);
            const separation = 60 * (1 - progress); 
            ctx.globalCompositeOperation = 'lighter'; 
            ctx.shadowBlur = 20; ctx.shadowColor = '#3b82f6'; ctx.fillStyle = '#3b82f6'; 
            ctx.beginPath(); ctx.arc(0, -separation, 15, 0, Math.PI*2); ctx.fill();
            ctx.shadowColor = '#ef4444'; ctx.fillStyle = '#ef4444'; 
            ctx.beginPath(); ctx.arc(0, separation, 15, 0, Math.PI*2); ctx.fill();
            if (progress > 0.5) {
                ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(0, -separation); ctx.lineTo(0, separation); ctx.stroke();
            }
            ctx.restore();
        }

        ctx.rotate(this.angle);
        ctx.shadowBlur = 15; ctx.shadowColor = this.stats.color;
        ctx.fillStyle = this.stats.color; ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; 
        ctx.beginPath(); ctx.arc(15, 15, 8, 0, Math.PI*2); ctx.fill(); 
        ctx.beginPath(); ctx.arc(15, -15, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.ellipse(5, 8, 4, 2, 0, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(5, -8, 4, 2, 0, 0, Math.PI*2); ctx.fill();
        
        if (this.type === 'toji') { 
            ctx.save(); ctx.translate(15, 20); ctx.rotate(Math.PI / 2); ctx.scale(0.6, 0.6);
            ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-30, -3, 30, 6);
            ctx.fillStyle = '#d4d4d4'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#e5e5e5'; ctx.beginPath(); ctx.moveTo(4, -3); ctx.lineTo(12, -3); ctx.quadraticCurveTo(12, -18, 25, -12); ctx.quadraticCurveTo(20, -8, 25, -4); ctx.lineTo(50, 0); ctx.lineTo(25, 5); ctx.lineTo(4, 4); ctx.fill();
            ctx.restore();
        }
        ctx.restore();
        
        // Label & Health Bar for remote player
        ctx.save();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Teko, Arial'; // Use Teko font for premium feel
        ctx.textAlign = 'center';
        
        // Use this.name instead of type
        const displayName = this.isDead ? "DECEASED" : this.name.toUpperCase();
        ctx.fillText(displayName, this.x, this.y - 45);

        // Mini Health Bar
        if (!this.isDead) {
            const barW = 50;
            ctx.fillStyle = '#333'; ctx.fillRect(this.x - barW/2, this.y - 35, barW, 6);
            ctx.fillStyle = '#ef4444'; ctx.fillRect(this.x - barW/2, this.y - 35, barW * (this.health / this.maxHealth), 6);
        }
        ctx.restore();
    }

    punch() {
        if (this.type === 'gojo') {
            const offset = (Math.random() < 0.5) ? -20 : 20;
            const px = this.x + Math.cos(this.angle) * 30 + Math.cos(this.angle + Math.PI/2) * offset;
            const py = this.y + Math.sin(this.angle) * 30 + Math.sin(this.angle + Math.PI/2) * offset;
            this.spawn(new PunchBox(px, py, this.angle, this, 25, false)); 
        } else if (this.type === 'sukuna') {
            this.spawn(new CleaveSlash(this.x, this.y, this.angle));
        } else {
            this.spawn(new KatanaSlash(this.x, this.y, this.angle, this, -1));
            setTimeout(() => this.spawn(new KatanaSlash(this.x, this.y, this.angle, this, 1)), 150);
        }
    }

    skillQ() {
        if (this.type === 'gojo') {
            let count = 0;
            const iv = setInterval(() => {
                const px = this.x + Math.cos(this.angle) * 40;
                const py = this.y + Math.sin(this.angle) * 40;
                this.spawn(new PunchBox(px, py, this.angle, this, 15));
                count++; if(count>=4) clearInterval(iv);
            }, 80);
        } else if (this.type === 'toji') { 
            this.spawn(new InvertedSpear(this.x, this.y, this.angle));
        }
    }

    skillE() {
        if (this.type === 'gojo') { this.spawn(new BlueOrb(this.x, this.y, this.angle, this, null)); } 
        else if (this.type === 'sukuna') { this.spawn(new FireArrow(this.x, this.y, this.angle)); } 
        else { 
            this.spawn(new TojiBullet(this.x, this.y, this.angle));
        }
    }

    skillR() {
        if (this.type === 'gojo') { this.spawn(new RedOrb(this.x, this.y, this.angle)); } 
        else if (this.type === 'sukuna') {
            this.spawn(new WorldSlash(this.x, this.y, this.angle, {}));
        } 
    }

    skillUlt() {
        if (this.type === 'sukuna') {
            this.spawn(new MalevolentShrineObject(this.x, this.y, {}));
        } else {
            this.casting.active = true;
            this.casting.timer = 0;
            this.casting.type = this.type === 'gojo' ? 'purple' : 'heavenly';
        }
    }
}
