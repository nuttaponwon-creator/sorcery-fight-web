// src/entities/RemotePlayer.js

import { CHAR_DATA, SKILL_SETTINGS } from '../config.js';
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
    CursedSpeech,
    RikaClaw,
    ManifestRika,
    InfiniteVoid
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
        this.angle = data.angle;
    }

    update(camera) {
        // Lerp position
        this.x += (this.targetX - this.x) * 0.2;
        this.y += (this.targetY - this.y) * 0.2;
    }

    draw(ctx) {
        if (this.isDead) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        ctx.shadowBlur = 15; ctx.shadowColor = this.stats.color;
        ctx.fillStyle = this.stats.color; ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(15, 10, 6, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(15, -10, 6, 0, Math.PI*2); ctx.fill();
        
        ctx.restore();

        // Name & HP Bar
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = 'white'; ctx.font = '12px Arial'; ctx.textAlign = 'center';
        ctx.fillText(this.name, 0, -45);
        
        const hpPercent = this.health / this.maxHealth;
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-20, -35, 40, 5);
        ctx.fillStyle = '#dc2626'; ctx.fillRect(-20, -35, 40 * hpPercent, 5);
        ctx.restore();
    }

    performAction(type, angle) {
        if (type === 'punch') {
            if (this.type === 'gojo') this.spawn(new PunchBox(this.x, this.y, angle, 35));
            else if (this.type === 'sukuna') this.spawn(new CleaveSlash(this.x, this.y, angle));
            else this.spawn(new KatanaSlash(this.x, this.y, angle, this, 1));
        }
        else if (type === 'skillQ') {
            if (this.type === 'gojo') this.spawn(new BlueOrb(this.x, this.y, SKILL_SETTINGS.gojo.blue));
            else if (this.type === 'yuta') this.spawn(new CursedSpeech(this.x, this.y, SKILL_SETTINGS.yuta.cursedSpeech));
            else if (this.type === 'toji') this.spawn(new InvertedSpear(this.x, this.y, angle));
        }
        else if (type === 'skillE') {
            if (this.type === 'gojo') this.spawn(new RedOrb(this.x, this.y, angle, SKILL_SETTINGS.gojo.red));
            else if (this.type === 'sukuna') this.spawn(new FireArrow(this.x, this.y, angle));
            else if (this.type === 'yuta') this.spawn(new RikaClaw(this.x, this.y, angle, SKILL_SETTINGS.yuta.rikaClaw));
            else this.spawn(new TojiBullet(this.x, this.y, angle));
        }
        else if (type === 'skillR') {
            if (this.type === 'sukuna') this.spawn(new WorldSlash(this.x, this.y, angle, SKILL_SETTINGS.sukuna.worldSlash));
        }
        else if (type === 'skillUlt') {
            if (this.type === 'gojo') {
                this.spawn(new HollowPurple(this.x, this.y, angle));
                this.spawn(new InfiniteVoid(this.x, this.y, SKILL_SETTINGS.gojo.void));
            }
            else if (this.type === 'sukuna') this.spawn(new MalevolentShrineObject(this.x, this.y, SKILL_SETTINGS.sukuna.shrine));
            else if (this.type === 'yuta') this.spawn(new ManifestRika(this.x, this.y, SKILL_SETTINGS.yuta.manifest));
        }
    }
}
