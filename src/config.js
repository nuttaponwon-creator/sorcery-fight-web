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
            damage: 300,     // ดาเมจแรงๆ
            radius: 100,     // ความกว้างของคลื่นดาบ (จากปีกบนถึงปีกล่าง)
            speed: 30,       // ความเร็วในการพุ่ง
            lifespan: 50     // ระยะทางที่พุ่งไปได้ (ยิ่งเยอะยิ่งไกล)
        },
        shrine: { 
            damagePerFrame: 0.8, 
            radius: 450, 
            duration: 600, // 10 วินาที
            slashFrequency: 1 
        }
    },
    toji: {
        spear: { damage: 40, range: 150 },         // Q: หอกพลิกฟ้า (แทงทะลุ)
        chain: { damage: 25, range: 400 },         // E: โซ่หมื่นลี้ (ฟาดไกล)
        playfulCloud: { damage: 60, radius: 120 }, // R: อิยูอุน (ฟาดรอบตัว)
        heavenly: { duration: 600, speedBuff: 2.0 } // Space: กายาสวรรค์ (วิ่งเร็วจัด)
    }
};

export const CHAR_DATA = {
    gojo: {
        name: "Gojo", color: '#3b82f6', hp: 150, speed: 6,
        cd: { q: 120, e: 300, r: 300, space: 900 }
    },
    sukuna: {
        name: "Sukuna", color: '#dc2626', hp: 180, speed: 5.5,
        cd: { q: 100, e: 400, r: 600, space: 900 }
    },
    toji: { 
        name: "Toji", 
        color: '#10b981', // สีเขียวมรกต/ดำ
        hp: 250,          // อึดมาก
        speed: 8,         // เร็วสุดในเกม
        cd: { q: 80, e: 180, r: 300, space: 1200 } // คูลดาวน์ไว เพราะเน้นกายภาพ
    }
};