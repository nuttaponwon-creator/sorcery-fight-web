// src/config.js

export const CONFIG = {
    WORLD_WIDTH: 3000,
    WORLD_HEIGHT: 3000,
    SPAWN_RATE: 80,
    PLAYER_RADIUS: 22,
};

export const SKILL_SETTINGS = {
    gojo: {
        punch: { damage: 35, radius: 60 },
        blue: { pullForce: 9, radius: 100, duration: 180 },
        red: { damage: 60, pushForce: 250, radius: 150 },
        purple: { damage: 200, radius: 150 },
        void: { radius: 1000, duration: 240 }
    },
    sukuna: {
        dismantle: { damage: 200, secondary: 100 },
        cleave: { damage: 180, executeThreshold: 0.2, executeMultiplier: 3 },
        flameArrow: { impactDamage: 220, burnDamage: 40, burnDuration: 180, radius: 80 },
        shrine: { duration: 480, slashFrequency: 15 } // 8 seconds, 4 slashes/sec
    },
    toji: {
        rapidSlash: { baseDamage: 60, maxDamage: 120, maxHitsPerSec: 10, range: 120 },
        worm: { damage: 150, baseBounces: 3, maxBounces: 5 },
        voidSlash: { damage: 280, range: 300 },
        berserk: { duration: 300, autoSlashDmg: 80, autoSlashRadius: 150, penaltyDuration: 120 }
    },
    yuta: {
        katanaSlash: { damage: 30, radius: 80, burstDamage: 70, burstRadius: 150 },
        rikaManifest: { damage: 150, radius: 200 },
        cursedSpeech: { radius: 300, stunDuration: 180, damage: 15 },
        rikaTrueForm: { duration: 360, attackRate: 30, damage: 50, radius: 100 }
    }
};

export const CHAR_DATA = {
    gojo: { name: "Gojo", color: '#3b82f6', hp: 150, speed: 3, cd: { q: 720, e: 1200, r: 1800, space: 5400 } },
    sukuna: { name: "Sukuna", color: '#dc2626', hp: 250, speed: 3, cd: { q: 180, e: 480, r: 720, space: 300 } },
    toji: { name: "Toji", color: '#10b981', hp: 200, speed: 4.5, cd: { q: 30, e: 480, r: 360, space: 3600 } },
    yuta: { name: "Yuta", color: '#e2e8f0', hp: 180, speed: 3.5, damage: 20, cd: { q: 60, e: 600, r: 1200, space: 3600 } }
};