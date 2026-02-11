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
        red: { damage: 60, pushForce: 150, radius: 200 }, // R มีดาเมจแรง
        purple: { damage: 999, radius: 120 }
    },
    sukuna: {
        slash: { damage: 20 }, // ต่อยปกติแรงขึ้นนิดนึง
        cleave: { damage: 15, range: 200 }, // Q ตัดรัว
        fireArrow: { damage: 100, explosionRadius: 250 }, // E ระเบิดแรง
        worldSlash: { damage: 300, radius: 120, speed: 30, lifespan: 50 },
        shrine: { 
            damagePerFrame: 1.5, 
            radius: 450, 
            duration: 600, 
            slashFrequency: 0.4 // ฟันถี่ขึ้น
        }
    },
    toji: {
        spear: { damage: 50, range: 300 }, // Q ไกลขึ้น
        gun: { damage: 30, speed: 40 },    // E ปืนพก
        rapidSlash: { damage: 25, range: 100 }, // R ฟันรัว
        heavenly: { duration: 600, speedBuff: 2.2 } 
    }
};

export const CHAR_DATA = {
    gojo: { name: "Gojo", color: '#3b82f6', hp: 150, speed: 3, cd: { q: 300, e: 300, r: 300, space: 4000 } },
    sukuna: { name: "Sukuna", color: '#dc2626', hp: 250, speed: 3, cd: { q: 10, e: 400, r: 600, space: 5000 } }, // Q คูลดาวน์ไวเพราะกดค้าง
    toji: { name: "Toji", color: '#10b981', hp: 200, speed: 4, cd: { q: 300, e: 300, r: 10, space: 2200 } } // R คูลดาวน์ไวเพราะกดค้าง
};