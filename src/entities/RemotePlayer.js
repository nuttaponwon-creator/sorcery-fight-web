// src/entities/RemotePlayer.js

import { CHAR_DATA, SKILL_SETTINGS } from '../config.js';
import { 
    PunchBox, BlueOrb, RedOrb, HollowPurple, InfiniteVoid,
    DismantleWave, CleaveSlash, FlameArrow, MalevolentShrineObject,
    TojiKatanaSlash, WormProjectile, VoidSlash, AutoSlashAura,
    YutaKatanaSlash, RikaManifest, CursedSpeech, RikaTrueForm
} from './SkillObjects.js';

export class RemotePlayer {
    constructor(type, x, y, spawnerCallback) {
        this.type = type;
        this.stats = CHAR_DATA[type] || CHAR_DATA['gojo'];
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
    }

    updateState(data) {
        this.targetX = data.x;
        this.targetY = data.y;
        this.targetAngle = data.angle;
    }

    update(camera) {
        // Position Lerp (0.2 for smoother but responsive feel)
        this.x += (this.targetX - this.x) * 0.2;
        this.y += (this.targetY - this.y) * 0.2;

        // Angle Lerp (Shortest path interpolation)
        let diff = this.targetAngle - this.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.angle += diff * 0.2;
    }

    draw(ctx) {
        if (this.isDead) return;
        
        // Use custom draw if defined in character classes (we'll manually handle here for simplicity)
        if (this.type === 'sukuna') {
            this.drawSukuna(ctx);
        } else if (this.type === 'yuta') {
            this.drawYuta(ctx);
        } else {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            
            ctx.shadowBlur = 15; ctx.shadowColor = this.stats.color;
            ctx.fillStyle = this.stats.color; ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(15, 10, 6, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(15, -10, 6, 0, Math.PI*2); ctx.fill();
            
            ctx.restore();
        }

        // Name & HP Bar
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = 'white'; ctx.font = 'bold 14px "Outfit"'; ctx.textAlign = 'center';
        ctx.fillText(this.name, 0, -45);
        
        const hpPercent = Math.max(0, this.health / this.maxHealth);
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(-25, -35, 50, 6);
        ctx.fillStyle = '#dc2626'; ctx.fillRect(-25, -35, 50 * hpPercent, 6);
        ctx.restore();
    }

    drawSukuna(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = '#fde68a';
        ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(8, -4); ctx.lineTo(12, -6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8, 4); ctx.lineTo(12, 6); ctx.stroke();
        ctx.fillStyle = '#ef4444'; ctx.shadowBlur = 10; ctx.shadowColor = '#ef4444';
        ctx.beginPath(); ctx.arc(8, -5, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, 5, 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    drawYuta(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath(); for(let i=0; i<6; i++) { ctx.moveTo(-12, 0); ctx.lineTo(-15 + i*4, -20); ctx.lineTo(-5 + i*2, -10); } ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(8, -5, 2, 0, Math.PI*2); ctx.arc(8, 5, 2, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }

    performAction(actionType, angle) {
        const id = this.ownerId;
        if (actionType === 'punch') {
            if (this.type === 'gojo') this.spawn(new PunchBox(this.x, this.y, angle, { damage: 20 }, id));
            else if (this.type === 'sukuna') this.spawn(new CleaveSlash(this.x, this.y, angle, { damage: SKILL_SETTINGS.sukuna.cleave.damage, isSecondary: false }, id));
            else if (this.type === 'toji') this.spawn(new TojiKatanaSlash(this.x, this.y, angle, { owner: this, damage: 80, range: 120 }, id));
            else if (this.type === 'yuta') this.spawn(new YutaKatanaSlash(this.x, this.y, angle, { owner: this, side: 1, isBurst: false, damage: 25 }, id));
        }
        else if (actionType === 'skillQ') {
            if (this.type === 'gojo') this.spawn(new BlueOrb(this.x, this.y, angle, SKILL_SETTINGS.gojo.blue, id));
            else if (this.type === 'sukuna') this.spawn(new DismantleWave(this.x, this.y, angle, { damage: SKILL_SETTINGS.sukuna.dismantle.damage, isSecondary: false }, id));
            else if (this.type === 'toji') this.spawn(new TojiKatanaSlash(this.x, this.y, angle, { owner: this, damage: 100, range: 140 }, id));
            else if (this.type === 'yuta') this.spawn(new YutaKatanaSlash(this.x, this.y, angle, { owner: this, side: 1, isBurst: false, damage: 30 }, id));
        }
        else if (actionType === 'skillE') {
            if (this.type === 'gojo') this.spawn(new BlueOrb(this.x, this.y, angle, SKILL_SETTINGS.gojo.blue, id));
            else if (this.type === 'sukuna') this.spawn(new CleaveSlash(this.x, this.y, angle, { damage: SKILL_SETTINGS.sukuna.cleave.damage, isSecondary: false }, id));
            else if (this.type === 'toji') this.spawn(new WormProjectile(this.x, this.y, angle, { damage: 150, maxBounces: 3 }, id));
            else if (this.type === 'yuta') this.spawn(new RikaManifest(this.x, this.y, angle, { damage: 150 }, id));
        }
        else if (actionType === 'skillR') {
            if (this.type === 'gojo') this.spawn(new RedOrb(this.x, this.y, angle, SKILL_SETTINGS.gojo.red, id));
            else if (this.type === 'sukuna') this.spawn(new FlameArrow(this.x, this.y, angle, { impactDamage: 220, burnDamage: 40, radius: 80, isSecondary: false }, id));
            else if (this.type === 'toji') this.spawn(new VoidSlash(this.x, this.y, angle, { owner: this, damage: 280, range: 300 }, id));
            else if (this.type === 'yuta') this.spawn(new CursedSpeech(this.x, this.y, angle, { damage: 15 }, id));
        }
        else if (actionType === 'skillUlt') {
            if (this.type === 'gojo') this.spawn(new HollowPurple(this.x, this.y, angle, {}, id));
            else if (this.type === 'sukuna') this.spawn(new MalevolentShrineObject(this.x, this.y, angle, { duration: 480, slashFrequency: 15 }, id));
            else if (this.type === 'toji') this.spawn(new AutoSlashAura(this.x, this.y, angle, { owner: this, damage: 80, radius: 150, duration: 300 }, id));
            else if (this.type === 'yuta') this.spawn(new RikaTrueForm(this.x, this.y, angle, { owner: this, damage: 50 }, id));
        }
    }
}
