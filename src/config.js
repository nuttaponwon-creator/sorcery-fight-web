// src/config.js

export const CONFIG = {
    WORLD_WIDTH: 3000,
    WORLD_HEIGHT: 3000,
    SPAWN_RATE: 80,
    PLAYER_RADIUS: 22,
};

export const SKILL_SETTINGS = {
    gojo: {
        punch: { damage: 20, radius: 40 },
        blue: { pullForce: 6, radius: 250, duration: 240 },
        red: { damage: 30, pushForce: 120, radius: 200 },
        purple: { damage: 999, radius: 100 }
    },
    sukuna: {
        slash: { damage: 10 },
        fireArrow: { damage: 80, explosionRadius: 500 },
        worldSlash: { 
            damage: 300,
            radius: 100,
            speed: 30,
            lifespan: 50
        },
        shrine: { 
            damagePerFrame: 0.8, 
            radius: 450, 
            duration: 600, 
            slashFrequency: 0.3 // ✅ ลดลงจาก 1 เพื่อแก้แล็ค (แต่เดี๋ยวไปเพิ่มเอฟเฟกต์ให้ดูเยอะเอง)
        }
    },
    toji: {
        spear: { damage: 40, range: 150 },
        chain: { damage: 25, range: 400 },
        playfulCloud: { damage: 60, radius: 120 },
        heavenly: { duration: 600, speedBuff: 2.0 }
    }
};

export const CHAR_DATA = {
    gojo: { name: "Gojo", color: '#3b82f6', hp: 150, speed: 6, cd: { q: 120, e: 300, r: 300, space: 900 } },
    sukuna: { name: "Sukuna", color: '#dc2626', hp: 180, speed: 5.5, cd: { q: 100, e: 400, r: 600, space: 900 } },
    toji: { name: "Toji", color: '#10b981', hp: 250, speed: 8, cd: { q: 80, e: 180, r: 300, space: 1200 } }
};