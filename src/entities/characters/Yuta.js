// src/entities/characters/Yuta.js
import { Player } from '../Player.js';
import { YutaKatanaSlash, RikaManifest, CursedSpeech, RikaTrueForm } from '../SkillObjects.js';
import { SKILL_SETTINGS } from '../../config.js';
import { input } from '../../core/Input.js';

export class Yuta extends Player {
    constructor(x, y, audio) {
        super(x, y, 'yuta', audio);
        this.rikaGauge = 100;
        this.mimicryTimer = 0;
        this.comboCountQ = 0;
        this.comboTimerQ = 0;
        
        // Visual
        this.ringGlow = 0;
    }

    update() {
        super.update();
        
        // Rika Auto-Regen (1 per second => ~0.016 per frame)
        if (this.rikaGauge < 100) {
            this.rikaGauge = Math.min(100, this.rikaGauge + (1 / 60));
        }

        if (this.mimicryTimer > 0) this.mimicryTimer--;
        if (this.comboTimerQ > 0) {
            this.comboTimerQ--;
            if (this.comboTimerQ === 0) this.comboCountQ = 0;
        }
    }

    addRika(amount) {
        this.rikaGauge = Math.min(100, this.rikaGauge + amount);
        if (amount > 0) {
            this.mimicryTimer = 1800; // 30s Mimicry Buff on kill
            this.ringGlow = 30; // Visual flash
        }
    }

    getDamageMultiplier() {
        if (this.mimicryTimer > 0) {
            // Up to +40% damage based on Rika gauge
            return 1 + (0.4 * (this.rikaGauge / 100));
        }
        return 1;
    }

    punch() {
        if (this.isPunching || this.casting.active) return;
        this.isPunching = true;
        const side = (Math.random() < 0.5 ? 1 : -1);
        this.spawn(new YutaKatanaSlash(this.x, this.y, this.angle, { owner: this, side, isBurst: false, damage: this.stats.damage * this.getDamageMultiplier() }));
        if (this.audio) this.audio.playSFX('slash');
        setTimeout(() => { this.isPunching = false; }, 200);
    }

    skillQ() {
        if (this.cd.q > 0 || this.casting.active) return;
        this.cd.q = this.stats.cd.q;
        
        const side = (this.comboCountQ % 2 === 0) ? 1 : -1;
        const isBurst = (this.comboCountQ >= 2);
        
        const baseDmg = isBurst ? SKILL_SETTINGS.yuta.katanaSlash.burstDamage : SKILL_SETTINGS.yuta.katanaSlash.damage;
        const dmg = baseDmg * this.getDamageMultiplier();
        
        this.spawn(new YutaKatanaSlash(this.x, this.y, this.angle, { owner: this, side, isBurst, damage: dmg }));
        if (this.audio) this.audio.playSFX('slash');
        
        this.comboCountQ++;
        this.comboTimerQ = 90; // 1.5s window for combo
        if (isBurst) this.comboCountQ = 0;
    }

    skillE() {
        if (this.cd.e > 0 || this.casting.active || this.rikaGauge < 25) return;
        this.rikaGauge -= 25;
        this.cd.e = this.stats.cd.e;
        
        const dmg = SKILL_SETTINGS.yuta.rikaManifest.damage * this.getDamageMultiplier();
        // Fallback to player position if world mouse not set yet
        const tx = (input.mouse.worldX !== undefined) ? input.mouse.worldX : this.x;
        const ty = (input.mouse.worldY !== undefined) ? input.mouse.worldY : this.y;
        this.spawn(new RikaManifest(tx, ty, dmg));
        if (this.audio) this.audio.playSFX('slash');
    }

    skillR() {
        if (this.cd.r > 0 || this.casting.active || this.rikaGauge < 35) return;
        this.rikaGauge -= 35;
        this.cd.r = this.stats.cd.r;
        
        const stats = SKILL_SETTINGS.yuta.cursedSpeech;
        this.spawn(new CursedSpeech(this.x, this.y, this.angle, { damage: stats.damage * this.getDamageMultiplier() }));
        if (this.audio) this.audio.playSFX('purple_charge'); // Need cursed speech sound
    }

    skillUlt() {
        if (this.cd.space > 0 || this.casting.active || this.rikaGauge < 60) return;
        this.rikaGauge -= 60;
        this.cd.space = this.stats.cd.space;
        const stats = SKILL_SETTINGS.yuta.rikaTrueForm;
        this.spawn(new RikaTrueForm(this.x, this.y, this.angle, { owner: this, damage: stats.damage * this.getDamageMultiplier() }));
        if (this.audio) this.audio.playSFX('domain'); 
    }

    draw(ctx) {
        // Draw Mimicry Aura
        if (this.mimicryTimer > 0) {
            ctx.save();
            ctx.translate(this.x, this.y);
            const intensity = this.rikaGauge / 100;
            ctx.globalCompositeOperation = 'lighter';
            ctx.shadowBlur = 20 * intensity;
            ctx.shadowColor = '#d8b4fe'; // Purple aura
            ctx.fillStyle = `rgba(216, 180, 254, ${0.1 + (0.3 * intensity)})`;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 10 + Math.sin(Date.now()/200)*5, 0, Math.PI*2);
            ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Yuta Body (White Uniform)
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#94a3b8'; ctx.stroke();

        // Hair (Black messy)
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        for(let i=0; i<6; i++) {
            ctx.moveTo(-12, 0);
            ctx.lineTo(-15 + i*4, -20 + (i%2)*5);
            ctx.lineTo(-5 + i*2, -10);
        }
        ctx.fill();

        // Face
        ctx.fillStyle = '#fde68a';
        ctx.beginPath(); ctx.ellipse(4, 0, 10, 14, 0, -Math.PI/2, Math.PI/2); ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(8, -5, 2, 0, Math.PI*2);
        ctx.arc(8, 5, 2, 0, Math.PI*2);
        ctx.fill();

        // Ring Glow (when kills occur)
        if (this.ringGlow > 0) {
            this.ringGlow--;
            ctx.shadowBlur = 10; ctx.shadowColor = '#c084fc';
            ctx.fillStyle = '#c084fc';
            ctx.beginPath(); ctx.arc(12, 10, 3, 0, Math.PI*2); ctx.fill(); // Left hand ring
        }

        ctx.restore();
    }
}
