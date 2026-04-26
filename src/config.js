// src/config.js

export const CONFIG = {
    WORLD_WIDTH: 3000,
    WORLD_HEIGHT: 3000,
    SPAWN_RATE: 80,
    PLAYER_RADIUS: 22,
};

export const SKILL_SETTINGS = {
    gojo: {
        punch: { damage: 25, radius: 50 },
        blue: { pullForce: 8, radius: 300, duration: 240 },
        red: { damage: 60, pushForce: 150, radius: 200 },
        purple: { damage: 999, radius: 120 }
    },
    sukuna: {
        slash: { damage: 20 },
        cleave: { damage: 15, range: 200 },
        fireArrow: { damage: 100, explosionRadius: 250 },
        worldSlash: { damage: 300, radius: 120, speed: 30, lifespan: 50 },
        shrine: { damagePerFrame: 1.5, radius: 450, duration: 600, slashFrequency: 0.4 }
    },
    toji: {
        spear: { damage: 50, range: 300 },
        gun: { damage: 30, speed: 40 },
        rapidSlash: { damage: 25, range: 100 },
        heavenly: { duration: 600, speedBuff: 2.2 } 
    },
    yuta: {
        cursedSpeech: { radius: 250, damage: 15, stunDuration: 180 },
        rikaClaw: { damage: 120, radius: 150 },
        copy: { damage: 150, range: 450 },
        manifest: { damage: 500, radius: 500, duration: 600 }
    }
};

export const CHAR_DATA = {
    gojo: { name: "Gojo", color: '#3b82f6', hp: 150, speed: 3, cd: { q: 300, e: 300, r: 300, space: 4000 } },
    sukuna: { name: "Sukuna", color: '#dc2626', hp: 250, speed: 3, cd: { q: 10, e: 400, r: 600, space: 5000 } },
    toji: { name: "Toji", color: '#10b981', hp: 200, speed: 4, cd: { q: 300, e: 300, r: 10, space: 2200 } },
    yuta: { name: "Yuta", color: '#e2e8f0', hp: 180, speed: 3.5, cd: { q: 400, e: 600, r: 800, space: 6000 } }
};