// src/entities/characters/Sukuna.js
import { Player } from '../Player.js';
import { DismantleWave, CleaveSlash, FlameArrow, MalevolentShrineObject } from '../SkillObjects.js';
import { SKILL_SETTINGS } from '../../config.js';

export class Sukuna extends Player {
    constructor(x, y, audio) {
        super(x, y, 'sukuna', audio);
        this.shrineGauge = 0;
    }

    addShrine(amount) {
        this.shrineGauge = Math.min(100, this.shrineGauge + amount);
    }

    // Passive: Reflect 20% damage — handled server-side in main.js via Sukuna passive check
    punch() {
        if (this.isPunching || this.casting.active) return;
        this.isPunching = true;
        
        const px = this.x + Math.cos(this.angle) * 40;
        const py = this.y + Math.sin(this.angle) * 40;
        
        // Use CleaveSlash for punch (basic melee)
        this.spawn(new CleaveSlash(px, py, this.angle, { damage: SKILL_SETTINGS.sukuna.cleave.damage, isSecondary: false }));
        if (this.audio) this.audio.playSFX('slash');
        
        setTimeout(() => { this.isPunching = false; }, 150);
    }

    skillQ() {
        if (this.cd.q > 0 || this.casting.active) return;
        this.cd.q = this.stats.cd.q;
        
        const stats = SKILL_SETTINGS.sukuna.dismantle;
        this.spawn(new DismantleWave(this.x, this.y, this.angle, { damage: stats.damage, isSecondary: false }));
        
        // Passive secondary hit
        setTimeout(() => {
            this.spawn(new DismantleWave(this.x, this.y, this.angle, { damage: stats.secondary, isSecondary: true }));
        }, 100);

        this.addShrine(15);
        if (this.audio) this.audio.playSFX('slash');
    }

    skillE() {
        if (this.cd.e > 0 || this.casting.active) return;
        this.cd.e = this.stats.cd.e;
        
        const stats = SKILL_SETTINGS.sukuna.cleave;
        const px = this.x + Math.cos(this.angle) * 40;
        const py = this.y + Math.sin(this.angle) * 40;
        this.spawn(new CleaveSlash(px, py, this.angle, { damage: stats.damage, isSecondary: false }));
        
        // Passive secondary hit
        setTimeout(() => {
            this.spawn(new CleaveSlash(px, py, this.angle, { damage: stats.damage * 0.5, isSecondary: true }));
        }, 100);

        this.addShrine(15);
        if (this.audio) this.audio.playSFX('slash');
    }

    skillR() {
        if (this.cd.r > 0 || this.casting.active) return;
        this.cd.r = this.stats.cd.r;
        
        const stats = SKILL_SETTINGS.sukuna.flameArrow;
        this.spawn(new FlameArrow(this.x, this.y, this.angle, { 
            impactDamage: stats.impactDamage, 
            burnDamage: stats.burnDamage, 
            radius: stats.radius, 
            isSecondary: false 
        }));
        
        // Passive secondary hit
        setTimeout(() => {
            this.spawn(new FlameArrow(this.x, this.y, this.angle, { 
                impactDamage: stats.impactDamage * 0.5, 
                burnDamage: stats.burnDamage * 0.5, 
                radius: stats.radius, 
                isSecondary: true 
            }));
        }, 200);

        this.addShrine(20);
        if (this.audio) this.audio.playSFX('fire_arrow');
    }

    skillUlt() {
        if (this.cd.space > 0 || this.casting.active || this.shrineGauge < 100) return;
        this.casting.active = true; 
        this.casting.timer = 0;
        this.casting.type = 'shrine';
        
        // Consume gauge
        this.shrineGauge = 0;
    }

    finishUlt() {
        this.casting.active = false;
        this.cd.space = this.stats.cd.space;
        const stats = SKILL_SETTINGS.sukuna.shrine;
        this.spawn(new MalevolentShrineObject(this.x, this.y, this.angle, { duration: stats.duration, slashFrequency: stats.slashFrequency }));
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Body (Light skin tone)
        ctx.fillStyle = '#fde68a';
        ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
        
        // Tattoos (Black markings)
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        // Forehead markings
        ctx.beginPath(); ctx.moveTo(8, -4); ctx.lineTo(12, -6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8, 4); ctx.lineTo(12, 6); ctx.stroke();
        
        // Eyes (Red glow)
        ctx.fillStyle = '#ef4444';
        ctx.shadowBlur = 10; ctx.shadowColor = '#ef4444';
        ctx.beginPath(); ctx.arc(8, -5, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, 5, 3, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // Extra Eyes (Smaller ones below main)
        ctx.beginPath(); ctx.arc(6, -9, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(6, 9, 1.5, 0, Math.PI * 2); ctx.fill();

        // Kimono (White with black trim)
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-5, 0, this.radius - 2, Math.PI/2, -Math.PI/2);
        ctx.fill();

        ctx.restore();
    }
}
