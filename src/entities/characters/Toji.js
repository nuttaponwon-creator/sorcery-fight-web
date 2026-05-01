// src/entities/characters/Toji.js
import { Player } from '../Player.js';
import { TojiKatanaSlash, WormProjectile, VoidSlash, AutoSlashAura } from '../SkillObjects.js';
import { SKILL_SETTINGS } from '../../config.js';

export class Toji extends Player {
    constructor(x, y, audio) {
        super(x, y, 'toji', audio);
        this.bloodlust = 0;
        
        // Rapid Slash Q properties
        this.isHoldingQ = false;
        this.holdQTimer = 0; // Frames held (max 120 = 2s)
        this.rapidSlashTimer = 0;
    }

    addBloodlust() {
        if (this.bloodlust < 5) this.bloodlust++;
    }

    getDamageMultiplier() {
        return 1 + (this.bloodlust * 0.08); // +8% per stack
    }

    holdQ(isDown) {
        // If we are in berserk mode, Q requires no holding, it is just max speed, but auto-slash takes care of it, or we can allow max speed manual Q
        if (this.casting.active || this.isDead) {
            this.isHoldingQ = false;
            return;
        }

        this.isHoldingQ = isDown;
        if (!isDown) {
            // Released Q, trigger cooldown
            this.cd.q = this.stats.cd.q;
            this.holdQTimer = 0;
        } else if (this.cd.q > 0 && !(this.buffs.berserk > 0)) {
            // Cannot start holding if on CD (unless berserking)
            this.isHoldingQ = false;
        }
    }

    skillQ() {
        // Fallback if they just tap Q instead of holding
        this.holdQ(true);
        setTimeout(() => this.holdQ(false), 50);
    }

    update() {
        super.update();
        
        // Handle Q Holding Logic
        if (this.isHoldingQ && !this.isDead && !this.casting.active) {
            let hitRate = 0; // Frames per hit
            
            if (this.buffs.berserk > 0) {
                // Instantly max speed (10 hits/sec = 1 hit every 6 frames)
                hitRate = 6;
                this.holdQTimer = 120;
            } else {
                this.holdQTimer = Math.min(120, this.holdQTimer + 1);
                // Ramp up from 2 hits/sec (30 frames) to 10 hits/sec (6 frames)
                const progress = this.holdQTimer / 120;
                hitRate = 30 - (24 * progress); 
            }

            this.rapidSlashTimer++;
            if (this.rapidSlashTimer >= hitRate) {
                this.rapidSlashTimer = 0;
                this.executeRapidSlash();
            }
        } else {
            // Decay hold timer if not holding
            this.holdQTimer = 0;
            this.rapidSlashTimer = 0;
        }
    }

    executeRapidSlash() {
        const side = (Math.random() < 0.5 ? 1 : -1);
        const stats = SKILL_SETTINGS.toji.rapidSlash;
        const progress = this.holdQTimer / 120;
        let dmg = stats.baseDamage + ((stats.maxDamage - stats.baseDamage) * progress);
        dmg *= this.getDamageMultiplier();
        this.spawn(new TojiKatanaSlash(this.x, this.y, this.angle, { owner: this, offsetSide: side, damage: dmg, range: stats.range }));
        if (this.audio && Math.random() < 0.3) this.audio.playSFX('slash');
    }

    punch() {
        // Basic attack just does a single rapid slash hit
        if (this.isHoldingQ) return; // Prevent if holding Q
        this.executeRapidSlash();
    }

    skillE() {
        if (this.cd.e > 0 || this.casting.active) return;
        this.cd.e = this.stats.cd.e;
        
        const stats = SKILL_SETTINGS.toji.worm;
        
        this.spawn(new WormProjectile(this.x, this.y, this.angle, { damage: stats.damage, maxBounces: stats.maxBounces }));
        if (this.audio) this.audio.playSFX('punch'); // Replace with throw sound if available
    }

    skillR() {
        if (this.cd.r > 0 || this.casting.active) return;
        this.cd.r = this.stats.cd.r;
        
        const stats = SKILL_SETTINGS.toji.voidSlash;
        const side = this.comboCount === 1 ? -1 : 1;
        const dmg = this.comboCount >= 2 ? stats.damage * 1.5 : stats.damage;
        this.spawn(new VoidSlash(this.x, this.y, this.angle, { owner: this, damage: dmg, range: stats.range }));
        if (this.audio) this.audio.playSFX('teleport');
    }

    skillUlt() {
        if (this.cd.space > 0 || this.casting.active) return;
        this.casting.active = true; 
        this.casting.timer = 0;
        this.casting.type = 'heavenly';
    }

    finishUlt() {
        this.casting.active = false;
        this.cd.space = this.stats.cd.space;
        const stats = SKILL_SETTINGS.toji.berserk;
        this.spawn(new AutoSlashAura(this.x, this.y, this.angle, { owner: this, damage: stats.autoSlashDmg, radius: stats.autoSlashRadius, duration: stats.duration }));
    }
}
