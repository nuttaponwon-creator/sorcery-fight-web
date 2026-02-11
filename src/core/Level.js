// src/core/Level.js

import { CONFIG } from '../config.js';

// 1. ข้อมูลกำแพง (ส่งออกไปให้ Player/Zombie ใช้เช็คชน)
export const OBSTACLES = [
    // ขอบโลก
    { x: -50, y: -50, w: 3100, h: 50 }, 
    { x: -50, y: 3000, w: 3100, h: 50 },
    { x: -50, y: 0, w: 50, h: 3000 },
    { x: 3000, y: 0, w: 50, h: 3000 },

    
    
    // กำแพงบังสายตา
    { x: 500, y: 500, w: 400, h: 50 },
    { x: 500, y: 550, w: 50, h: 300 },
    { x: 2100, y: 2100, w: 400, h: 50 },
    { x: 2450, y: 1800, w: 50, h: 350 },
    
    // เขาวงกต
    { x: 400, y: 2200, w: 20, h: 400 },
    { x: 600, y: 2400, w: 20, h: 400 },
    
    // สิ่งกีดขวางย่อย
    { x: 1800, y: 600, w: 100, h: 100 },
    { x: 1000, y: 1800, w: 150, h: 50 }
];

// 2. ข้อมูลจุดเกิด
export const SPAWN_ZONES = [
    { x: 100, y: 100, w: 300, h: 300 },
    { x: 2600, y: 100, w: 300, h: 300 },
    { x: 100, y: 2600, w: 300, h: 300 },
    { x: 2600, y: 2600, w: 300, h: 300 },
    { x: 1300, y: 100, w: 400, h: 200 },
    { x: 1300, y: 2700, w: 400, h: 200 }
];

// 3. Class สำหรับจัดการด่าน (วาด และ สุ่ม)
export class Level {
    constructor() {
        this.obstacles = OBSTACLES;
        this.spawnZones = SPAWN_ZONES;
    }

    draw(ctx) {
        // วาดพื้นหลัง/เส้น Grid (ย้ายมาจาก main.js ก็ได้ หรือวาดแค่กำแพง)
        ctx.fillStyle = '#111'; // สีพื้นกำแพง
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'black';

        this.obstacles.forEach(obs => {
            ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
            
            // ขอบกำแพง (Neon นิดๆ)
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
        });
        
        ctx.shadowBlur = 0; // Reset
    }

    getRandomSpawnPoint() {
        const zone = this.spawnZones[Math.floor(Math.random() * this.spawnZones.length)];
        return {
            x: zone.x + Math.random() * zone.w,
            y: zone.y + Math.random() * zone.h
        };
    }
}